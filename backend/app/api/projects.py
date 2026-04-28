from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.orm import selectinload
from typing import List, Optional
from ..database import get_db
from ..models import models
from ..schemas import schemas
from .utils import filter_valid_columns

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[schemas.ProjectResponse])
async def get_projects(include_deleted: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.Project).options(
        selectinload(models.Project.tasks).selectinload(models.ProjectTask.subtasks),
        selectinload(models.Project.comments),
        selectinload(models.Project.qa_items)
    )
    if not include_deleted:
        query = query.filter(models.Project.is_deleted == False)
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=schemas.ProjectResponse)
async def create_project(data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.Project, data)
    db_project = models.Project(**clean_data)
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.get("/{project_id}", response_model=schemas.ProjectResponse)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    query = select(models.Project).filter(models.Project.id == project_id).options(
        selectinload(models.Project.tasks).selectinload(models.ProjectTask.subtasks),
        selectinload(models.Project.tasks).selectinload(models.ProjectTask.comments),
        selectinload(models.Project.tasks).selectinload(models.ProjectTask.qa_items),
        selectinload(models.Project.comments),
        selectinload(models.Project.qa_items)
    )
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{project_id}", response_model=schemas.ProjectResponse)
async def update_project(project_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    db_project = await db.get(models.Project, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    clean_data = filter_valid_columns(models.Project, data)
    for key, value in clean_data.items():
        setattr(db_project, key, value)
    
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.delete("/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    db_project = await db.get(models.Project, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_project.is_deleted = True
    await db.commit()
    return {"message": "Project deleted"}

# --- Tasks ---
@router.post("/tasks", response_model=schemas.ProjectTaskResponse)
async def create_task(data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.ProjectTask, data)
    task = models.ProjectTask(**clean_data)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task

@router.put("/tasks/{task_id}", response_model=schemas.ProjectTaskResponse)
async def update_task(task_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    task = await db.get(models.ProjectTask, task_id)
    if not task: raise HTTPException(404, "Task not found")
    clean_data = filter_valid_columns(models.ProjectTask, data)
    for k, v in clean_data.items(): setattr(task, k, v)
    await db.commit()
    await db.refresh(task)
    return task

# --- Comments ---
@router.post("/comments", response_model=schemas.ProjectCommentResponse)
async def create_comment(data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.ProjectComment, data)
    comment = models.ProjectComment(**clean_data)
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment

# --- QA ---
@router.post("/qa", response_model=schemas.ProjectQAResponse)
async def create_qa(data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.ProjectQA, data)
    qa = models.ProjectQA(**clean_data)
    db.add(qa)
    await db.commit()
    await db.refresh(qa)
    return qa

@router.put("/qa/{qa_id}", response_model=schemas.ProjectQAResponse)
async def update_qa(qa_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    qa = await db.get(models.ProjectQA, qa_id)
    if not qa: raise HTTPException(404, "QA item not found")
    clean_data = filter_valid_columns(models.ProjectQA, data)
    for k, v in clean_data.items(): setattr(qa, k, v)
    await db.commit()
    await db.refresh(qa)
    return qa
