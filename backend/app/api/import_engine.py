from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, inspect
import pandas as pd
import io
import json
from typing import List, Dict, Any
from ..database import get_db
from ..models import models
from .utils import get_current_user_id

router = APIRouter(prefix="/import", tags=["Intelligence Engine"])

class ModelValidator:
    @staticmethod
    def get_model(table_name: str):
        mapping = {
            "devices": models.Device,
            "racks": models.Rack,
            "logical_services": models.LogicalService,
            "far_records": models.FarFailureMode,
            "port_connections": models.PortConnection
        }
        return mapping.get(table_name)

    @staticmethod
    def validate_row(model, row: Dict[str, Any]) -> List[str]:
        errors = []
        mapper = inspect(model)
        
        for column in mapper.columns:
            # Skip primary keys and system timestamps if not provided
            if column.primary_key or column.name in ["created_at", "updated_at"]:
                continue
                
            val = row.get(column.name)
            
            # 1. Nullability Check
            if not column.nullable and (val is None or str(val).strip() == "" or pd.isna(val)):
                # Check if it has a default value
                if column.default is None and column.server_default is None:
                    errors.append(f"Field '{column.name}' is required but missing.")
                continue

            if val is not None and not pd.isna(val):
                # 2. Type Checking
                try:
                    python_type = column.type.python_type
                    if python_type == int:
                        int(val)
                    elif python_type == float:
                        float(val)
                    elif python_type == bool:
                        if str(val).lower() not in ["true", "false", "1", "0", "yes", "no"]:
                            errors.append(f"Field '{column.name}' must be a boolean.")
                    elif python_type == dict or python_type == list:
                        if isinstance(val, str):
                            json.loads(val)
                except (ValueError, TypeError, json.JSONDecodeError):
                    errors.append(f"Field '{column.name}' has invalid type. Expected {column.type.python_type.__name__}.")

        return errors

@router.get("/template/{table_name}")
def download_template(table_name: str):
    model = ModelValidator.get_model(table_name)
    if not model:
        raise HTTPException(404, "Table model not found")
        
    mapper = inspect(model)
    cols = [c.name for c in mapper.columns if not c.primary_key and c.name not in ["created_at", "updated_at"]]
    
    df = pd.DataFrame(columns=cols)
    # Add a dummy row as example
    dummy = {}
    for c in mapper.columns:
        if c.primary_key or c.name in ["created_at", "updated_at"]: continue
        if c.type.python_type == int: dummy[c.name] = 0
        elif c.type.python_type == float: dummy[c.name] = 0.0
        elif c.type.python_type == bool: dummy[c.name] = True
        else: dummy[c.name] = "Example"
    
    df.loc[0] = dummy
    
    stream = io.BytesIO()
    df.to_csv(stream, index=False)
    stream.seek(0)
    
    return StreamingResponse(
        stream, 
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=SYSGRID_{table_name}_Template.csv"}
    )

@router.post("/audit")
async def audit_import(table_name: str, file: UploadFile = File(...)):
    """Pre-flight check: Validates file content against schema without writing to DB."""
    model = ModelValidator.get_model(table_name)
    if not model:
        raise HTTPException(404, "Table model not found")
        
    content = await file.read()
    try:
        # Support CSV and Excel
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
            
        results = []
        total_errors = 0
        
        # Replace NaN with None for validator
        df = df.where(pd.notnull(df), None)
        
        for idx, row in df.iterrows():
            row_dict = row.to_dict()
            errors = ModelValidator.validate_row(model, row_dict)
            results.append({
                "row": idx + 2, # +1 for 0-index, +1 for header
                "data": row_dict,
                "status": "VALID" if not errors else "INVALID",
                "errors": errors
            })
            if errors:
                total_errors += len(errors)
                
        return {
            "table_name": table_name,
            "total_rows": len(df),
            "valid_rows": len([r for r in results if r["status"] == "VALID"]),
            "invalid_rows": len([r for r in results if r["status"] == "INVALID"]),
            "total_errors": total_errors,
            "results": results
        }
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {str(e)}")

@router.post("/execute")
async def execute_import(table_name: str, data: List[Dict[str, Any]], request: Request, db: AsyncSession = Depends(get_db)):
    """Final ingestion step: Commits audited data to the database."""
    model = ModelValidator.get_model(table_name)
    if not model:
        raise HTTPException(404, "Table model not found")
        
    user_id = get_current_user_id(request)
    count = 0
    errors = []
    
    try:
        for idx, row_data in enumerate(data):
            # Final validation check
            row_errors = ModelValidator.validate_row(model, row_data)
            if row_errors:
                errors.append(f"Row {idx + 1}: {', '.join(row_errors)}")
                continue
            
            # Clean data (remove extra fields not in model)
            from .utils import filter_valid_columns
            clean_data = filter_valid_columns(model, row_data)
            
            # Set creator
            if hasattr(model, "created_by_user_id"):
                clean_data["created_by_user_id"] = user_id
                
            obj = model(**clean_data)
            db.add(obj)
            count += 1
            
        if errors:
            await db.rollback()
            return {"status": "failed", "errors": errors, "count": 0}
            
        await db.commit()
        
        # Add to Audit Trail
        db.add(models.AuditLog(
            user_id=user_id,
            action="BULK_IMPORT",
            target_table=table_name.upper(),
            target_id="MULTIPLE",
            description=f"Bulk imported {count} records into {table_name}."
        ))
        await db.commit()
        
        return {"status": "success", "count": count}
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, f"Ingestion failed: {str(e)}")
