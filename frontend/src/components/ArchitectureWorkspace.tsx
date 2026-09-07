import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ArchitectureHost from '../architecture/ArchitectureHost'

export default function ArchitectureWorkspace() {
  const location = useLocation(); const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const returnContext = params.get('return')
  const safeReturn = returnContext && returnContext.startsWith('/projects/') && !returnContext.includes('://') ? returnContext : null
  return <main data-workspace="architecture" data-pv1-architecture-workspace="true" style={{ minHeight: '100%', overflow: 'auto', padding: 24, background: 'var(--pv1-page, var(--bg-primary, #0b1220))' }}><header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><div><p style={{ margin: 0, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', opacity: .65 }}>Architecture workspace</p><h1 style={{ margin: '4px 0 0' }}>Canonical system model</h1></div>{safeReturn ? <button type="button" onClick={() => navigate(safeReturn)}>Return to Project context</button> : null}</header><ArchitectureHost /></main>
}
