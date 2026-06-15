import React from 'react'
import { Share } from 'lucide-react'
import toast from 'react-hot-toast'

interface WorkspaceShareHeaderProps {
  id: string
  title: string
}

export const WorkspaceShareHeader: React.FC<WorkspaceShareHeaderProps> = ({ id, title }) => {
  return (
    <button
      onClick={() => {
        const url = new URL(window.location.href);
        url.searchParams.set('id', String(id));
        navigator.clipboard.writeText(url.toString());
        toast.success(`Direct link for "${title}" copied to clipboard`);
      }}
      className="text-slate-500 hover:text-blue-400 transition-colors p-1"
      title="Share direct link"
    >
      <Share size={16} />
    </button>
  )
}
