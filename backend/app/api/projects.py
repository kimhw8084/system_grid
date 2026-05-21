from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, func
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
        selectinload(models.Project.tasks).selectinload(models.ProjectTask.comments),
        selectinload(models.Project.tasks).selectinload(models.ProjectTask.qa_items),
        selectinload(models.Project.comments),
        selectinload(models.Project.qa_items)
    )
    if not include_deleted:
        query = query.filter(models.Project.is_deleted == False)
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=schemas.ProjectResponse)
async def create_project(data: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    db_project = models.Project(**data.model_dump())
    db.add(db_project)
    await db.commit()
    # Re-fetch with all relations for response to avoid greenlet errors
    return await get_project(db_project.id, db)

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
async def update_project(project_id: int, data: schemas.ProjectUpdate, db: AsyncSession = Depends(get_db)):
    query = select(models.Project).filter(models.Project.id == project_id).options(
        selectinload(models.Project.tasks)
    )
    result = await db.execute(query)
    db_project = result.scalar_one_or_none()
    
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = data.model_dump(exclude_unset=True)
    tasks_data = update_data.pop("tasks", None)
    
    # Auto-set completed_at if status changed to Completed
    if update_data.get("status") == "Completed" and not db_project.completed_at and not update_data.get("completed_at"):
        db_project.completed_at = func.now()

    for key, value in update_data.items():
        setattr(db_project, key, value)
    
    # Handle Nested Tasks
    if tasks_data is not None:
        existing_tasks = {t.id: t for t in db_project.tasks}
        current_task_ids = {t_data.get("id") for t_data in tasks_data if t_data.get("id")}
        
        # Delete removed tasks
        for t_id, t_obj in existing_tasks.items():
            if t_id not in current_task_ids:
                await db.delete(t_obj)

        for t_data in tasks_data:
            t_id = t_data.get("id")
            clean_task_data = filter_valid_columns(models.ProjectTask, t_data)
            # Remove id and project_id from data to avoid multiple values
            clean_task_data.pop("id", None)
            clean_task_data.pop("project_id", None)
            
            if t_id and t_id in existing_tasks:
                task = existing_tasks[t_id]
                for k, v in clean_task_data.items():
                    setattr(task, k, v)
            else:
                # Create new task
                new_task = models.ProjectTask(**clean_task_data, project_id=project_id)
                db.add(new_task)
        
    await db.commit()
    # Re-fetch with all relations for response
    return await get_project(project_id, db)

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
    # Re-fetch task to avoid greenlet errors
    return await update_task(task.id, {}, db)

@router.put("/tasks/{task_id}", response_model=schemas.ProjectTaskResponse)
async def update_task(task_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    query = select(models.ProjectTask).filter(models.ProjectTask.id == task_id).options(
        selectinload(models.ProjectTask.subtasks),
        selectinload(models.ProjectTask.comments),
        selectinload(models.ProjectTask.qa_items)
    )
    result = await db.execute(query)
    task = result.scalar_one_or_none()
    if not task: raise HTTPException(404, "Task not found")
    clean_data = filter_valid_columns(models.ProjectTask, data)
    for k, v in clean_data.items(): setattr(task, k, v)
    await db.commit()
    await db.refresh(task) # This is safe now because relations are loaded
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
