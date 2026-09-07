import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyzePV1Schedule, previewPV1Move, type PV1Calendar, type PV1ScheduleEdge, type PV1ScheduleTask } from './ProjectsScheduleCore'

const fixture = JSON.parse(readFileSync(resolve(process.cwd(), '../shared/pv1_schedule_goldens.json'), 'utf8'))
const calendar = fixture.calendar as PV1Calendar
const journey = fixture.journey_3
const tasks = journey.tasks as PV1ScheduleTask[]
const dependencies = journey.dependencies as PV1ScheduleEdge[]

describe('PV1 shared schedule golden', () => {
  it('matches Journey 3 exact critical path and slack independently of DOM geometry', () => {
    const analysis = analyzePV1Schedule(tasks, dependencies, calendar)
    expect(analysis.critical_task_ids).toEqual(journey.expected.critical_task_ids)
    expect(Object.fromEntries(analysis.rows.map((row) => [row.task_id, row.slack_workdays]))).toEqual(journey.expected.slack_workdays)
  })

  it('uses working boundaries for the exact +2 B propagation', () => {
    const preview = previewPV1Move(tasks, dependencies, calendar, 'B', 2)
    const byId = new Map(preview.map((task) => [task.id, task]))
    for (const id of ['B', 'C', 'D', 'delivery']) expect(byId.get(id)).toMatchObject(journey.expected.move_b_two_workdays[id])
  })
})
