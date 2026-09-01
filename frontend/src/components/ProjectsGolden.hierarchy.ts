export type ProjectLike = {
  id: number | string
  name?: string | null
  parent_project_id?: number | string | null
  is_deleted?: boolean | null
  status?: string | null
  [key: string]: any
}

export type ProjectHierarchyContext = {
  parent: ProjectLike | null
  parentMissing: boolean
  children: ProjectLike[]
  ancestors: ProjectLike[]
}

export type ProjectHierarchyRailRow = ProjectLike & {
  __hierarchyDepth: number
  __parentUnavailable: boolean
  __childCount: number
  __isSubproject: boolean
}

const keyOf = (value: unknown) => String(value ?? '')
const live = (project: ProjectLike | null | undefined) => Boolean(project && !project.is_deleted)

export const isTopLevelProject = (project: ProjectLike | null | undefined) => live(project) && project?.parent_project_id == null

export const getTopLevelProjects = (projects: ProjectLike[]) => projects.filter(isTopLevelProject)

export const getDirectProjectChildren = (projects: ProjectLike[], projectId: number | string) =>
  projects.filter((project) => live(project) && project.parent_project_id != null && keyOf(project.parent_project_id) === keyOf(projectId))

export const getProjectHierarchyContext = (projects: ProjectLike[], project: ProjectLike | null | undefined): ProjectHierarchyContext => {
  if (!project) return { parent: null, parentMissing: false, children: [], ancestors: [] }
  const byId = new Map(projects.map((row) => [keyOf(row.id), row]))
  const parentId = project.parent_project_id
  const parentCandidate = parentId == null ? null : byId.get(keyOf(parentId)) || null
  const parent = live(parentCandidate) ? parentCandidate : null
  const ancestors: ProjectLike[] = []
  const seen = new Set<string>([keyOf(project.id)])
  let current = parent
  while (current && !seen.has(keyOf(current.id))) {
    ancestors.unshift(current)
    seen.add(keyOf(current.id))
    const nextId = current.parent_project_id
    const next = nextId == null ? null : byId.get(keyOf(nextId)) || null
    current = live(next) ? next : null
  }
  return {
    parent,
    parentMissing: parentId != null && !parent,
    children: getDirectProjectChildren(projects, project.id),
    ancestors,
  }
}

export const getProjectDescendantIds = (projects: ProjectLike[], projectId: number | string) => {
  const result = new Set<string>()
  const queue = [keyOf(projectId)]
  while (queue.length) {
    const parent = queue.shift()!
    for (const child of projects) {
      if (!live(child) || child.parent_project_id == null || keyOf(child.parent_project_id) !== parent) continue
      const childKey = keyOf(child.id)
      if (result.has(childKey)) continue
      result.add(childKey)
      queue.push(childKey)
    }
  }
  return result
}

export const getValidParentProjects = (projects: ProjectLike[], projectId?: number | string | null) => {
  const blocked = projectId == null ? new Set<string>() : getProjectDescendantIds(projects, projectId)
  if (projectId != null) blocked.add(keyOf(projectId))
  return projects.filter((project) => live(project) && !blocked.has(keyOf(project.id)))
}

export const buildProjectSelectorOptions = (projects: ProjectLike[]) => {
  const roots = getTopLevelProjects(projects)
  const rows: Array<{ value: number | string; label: string }> = []
  const seen = new Set<string>()
  const append = (project: ProjectLike, depth: number) => {
    const key = keyOf(project.id)
    if (seen.has(key)) return
    seen.add(key)
    rows.push({ value: project.id, label: `${depth ? `${'↳ '.repeat(depth)}` : ''}${project.name || `Project ${project.id}`}` })
    getDirectProjectChildren(projects, project.id).forEach((child) => append(child, depth + 1))
  }
  roots.forEach((root) => append(root, 0))
  projects.filter((project) => live(project) && !seen.has(keyOf(project.id))).forEach((orphan) => {
    rows.push({ value: orphan.id, label: `↳ ${orphan.name || `Project ${orphan.id}`} · parent unavailable` })
  })
  return rows
}

export const buildProjectHierarchyRailRows = (
  projects: ProjectLike[],
  baseRows: ProjectLike[],
  selectedProjectId?: number | string | null,
): ProjectHierarchyRailRow[] => {
  const allowed = new Set(baseRows.map((project) => keyOf(project.id)))
  const selectedKey = selectedProjectId == null ? '' : keyOf(selectedProjectId)
  const byId = new Map(projects.filter(live).map((project) => [keyOf(project.id), project]))
  const roots = getTopLevelProjects(projects)
  const result: ProjectHierarchyRailRow[] = []
  const seen = new Set<string>()

  const branchRelevant = (project: ProjectLike): boolean => {
    if (allowed.has(keyOf(project.id)) || keyOf(project.id) === selectedKey) return true
    return getDirectProjectChildren(projects, project.id).some(branchRelevant)
  }
  const append = (project: ProjectLike, depth: number) => {
    const key = keyOf(project.id)
    if (seen.has(key) || !branchRelevant(project)) return
    seen.add(key)
    const children = getDirectProjectChildren(projects, project.id)
    result.push({
      ...project,
      __hierarchyDepth: depth,
      __parentUnavailable: false,
      __childCount: children.length,
      __isSubproject: project.parent_project_id != null,
    })
    children.forEach((child) => append(child, depth + 1))
  }
  roots.forEach((root) => append(root, 0))

  for (const project of projects.filter(live)) {
    const key = keyOf(project.id)
    if (seen.has(key) || (!allowed.has(key) && key !== selectedKey)) continue
    const parentMissing = project.parent_project_id != null && !byId.has(keyOf(project.parent_project_id))
    if (!parentMissing) continue
    result.push({ ...project, __hierarchyDepth: 1, __parentUnavailable: true, __childCount: getDirectProjectChildren(projects, project.id).length, __isSubproject: true })
  }
  return result
}

export const projectExpectedOutcomes = (project: ProjectLike | null | undefined): string[] =>
  Array.isArray(project?.expected_outcomes) ? project!.expected_outcomes.map((item: unknown) => String(item).trim()).filter(Boolean) : []
