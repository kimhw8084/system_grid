#!/usr/bin/env python3
"""Materialize the required PV1 Architecture 5,000/10,000 fixture.

This is invoked only by the isolated P07 proof wrapper.  It receives an
explicit temporary SQLite URL and never discovers configured user databases.
"""
import argparse
import asyncio
import json
from pathlib import Path
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.architecture.models import ArchitectureAccess, ArchitectureModel, ArchitectureObject, ArchitectureRelation

TENANT_ID = 1
ACTOR = 'p07.architecture'
MODEL_ID = 'p07-large-architecture-model'


async def build(database_url: str, output: str) -> None:
    engine = create_async_engine(database_url, future=True)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        model = ArchitectureModel(id=MODEL_ID, tenant_id=TENANT_ID, name='P07 Required Large Architecture', description='PV1 5,000 object / 10,000 relation fixture', owner_id=ACTOR, schema_version='pv1.architecture.v1', lifecycle='Current', revision=1, created_by=ACTOR, updated_by=ACTOR)
        session.add(model)
        session.add(ArchitectureAccess(id=str(uuid4()), tenant_id=TENANT_ID, model_id=MODEL_ID, user_id=ACTOR, role='Owner', revision=1, created_by=ACTOR, updated_by=ACTOR))
        await session.flush()
        objects = [ArchitectureObject(id=f'p07-large-object-{index:05d}', tenant_id=TENANT_ID, model_id=MODEL_ID, kind='Component' if index % 3 else 'Application/Service', name=f'P07 Large Architecture Object {index:05d}', description='Authorized large-profile object', owner_id=ACTOR, lifecycle='Current', properties={'fixture_index': index}, tags=['p07-large'], revision=1, created_by=ACTOR, updated_by=ACTOR) for index in range(5000)]
        for start in range(0, len(objects), 500):
            session.add_all(objects[start:start + 500])
            await session.flush()
        relations = [ArchitectureRelation(id=f'p07-large-relation-{index:05d}', tenant_id=TENANT_ID, model_id=MODEL_ID, source_id=f'p07-large-object-{index % 5000:05d}', target_id=f'p07-large-object-{(index * 7 + 1) % 5000:05d}', relation_type='Depends on', name=f'P07 relation {index:05d}', properties={'fixture_index': index}, revision=1, created_by=ACTOR, updated_by=ACTOR) for index in range(10000)]
        for start in range(0, len(relations), 500):
            session.add_all(relations[start:start + 500])
            await session.flush()
        await session.commit()
    await engine.dispose()
    result = {'schema': 'sysgrid.pv1.architecture-large-fixture.v1', 'model_id': MODEL_ID, 'tenant_id': TENANT_ID, 'object_count': 5000, 'relation_count': 10000, 'contextual_projection_objects': 200, 'actor_id': ACTOR, 'database_url': database_url}
    Path(output).write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, sort_keys=True))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--database-url', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    asyncio.run(build(args.database_url, args.output))
