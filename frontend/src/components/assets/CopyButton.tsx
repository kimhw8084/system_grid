import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Clipboard } from 'lucide-react';

export const CopyButton = ({ value, label }: { value: string, label?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label || 'Value'} Copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(`Unable to copy ${label || 'value'}`);
    }
  };
  return (
    <button onClick={handleCopy} className="p-1 hover:bg-white/10 rounded-lg transition-all text-slate-500 hover:text-blue-400">
      {copied ? <Check size={10} /> : <Clipboard size={10} />}
    </button>
  );
};
