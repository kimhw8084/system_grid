export type ProjectsTimelineRoute = { projectId: string }

export function shouldUseProjectsTimeline(pathname: string): ProjectsTimelineRoute | null {
  const match = pathname.match(/^\/projects\/([^/]+)\/timeline\/?$/)
  return match ? { projectId: decodeURIComponent(match[1]) } : null
}
