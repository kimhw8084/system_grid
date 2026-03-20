import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import ForceGraph2D from 'react-force-graph-2d'

export default function NetworkFabric() {
  // We mock a graph for visual demonstration of the production feature
  const graphData = useMemo(() => {
    return {
      nodes: [
        { id: 'Core-A', group: 1, val: 20 },
        { id: 'Core-B', group: 1, val: 20 },
        { id: 'Spine-1', group: 2, val: 10 },
        { id: 'Spine-2', group: 2, val: 10 },
        { id: 'Server-01', group: 3, val: 5 },
        { id: 'Server-02', group: 3, val: 5 }
      ],
      links: [
        { source: 'Core-A', target: 'Spine-1' },
        { source: 'Core-A', target: 'Spine-2' },
        { source: 'Core-B', target: 'Spine-1' },
        { source: 'Core-B', target: 'Spine-2' },
        { source: 'Spine-1', target: 'Server-01' },
        { source: 'Spine-2', target: 'Server-02' }
      ]
    }
  }, [])

  return (
    <div className="h-full flex flex-col space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Network Topology</h1>
      
      <div className="h-1/2 glass-panel rounded-2xl overflow-hidden relative border-white/5">
        <div className="absolute top-4 left-4 z-10 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-white/5">
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Topology Graph</span>
        </div>
        <ForceGraph2D
          graphData={graphData}
          nodeAutoColorBy="group"
          nodeRelSize={6}
          linkColor={() => 'rgba(255,255,255,0.2)'}
          backgroundColor="#020617"
          width={1200}
          height={400}
        />
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-900/50 text-slate-500 uppercase tracking-wider border-b border-white/5 text-[10px]">
              <th className="px-6 py-4 font-bold">Server A</th>
              <th className="px-6 py-4 font-bold">Port A</th>
              <th className="px-6 py-4 font-bold">Server B</th>
              <th className="px-6 py-4 font-bold">Port B</th>
              <th className="px-6 py-4 font-bold">Speed</th>
              <th className="px-6 py-4 font-bold">Purpose</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-[11px]">
             <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-bold text-blue-100">Server-01</td>
                <td className="px-6 py-4 text-slate-400 font-mono">eth0</td>
                <td className="px-6 py-4 font-bold text-blue-100">Spine-1</td>
                <td className="px-6 py-4 text-slate-400 font-mono">Te1/1/1</td>
                <td className="px-6 py-4 text-emerald-400 font-bold">10 Gbps</td>
                <td className="px-6 py-4 text-slate-500 uppercase tracking-widest text-[9px]">Data Plane</td>
             </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
