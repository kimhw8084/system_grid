import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Server, Briefcase, AlertTriangle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/apiClient';

interface SearchResult {
  id: number;
  type: 'asset' | 'project' | 'far';
  title: string;
  subtitle: string;
  tag: string;
  path: string;
}

export const GlobalSearch = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        try {
          const res = await apiFetch(`/api/v1/dashboard/search?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setResults(data.results);
          setSelectedIndex(0);
        } catch (err) {
          console.error('Search failed:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex((prev) => (prev + 1) % results.length);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      e.preventDefault();
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    onClose();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'asset': return <Server size={14} className="text-blue-400" />;
      case 'project': return <Briefcase size={14} className="text-emerald-400" />;
      case 'far': return <AlertTriangle size={14} className="text-amber-400" />;
      default: return <ChevronRight size={14} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            className="w-full max-w-2xl bg-[#1e293b]/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative z-10 backdrop-blur-xl"
          >
            <div className="flex items-center p-4 border-b border-white/5 bg-white/5">
              <Search size={20} className="text-slate-500 mr-3" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search Assets, Projects, FAR Modes..."
                className="flex-1 bg-transparent border-none outline-none text-[13px] font-bold uppercase tracking-wider text-white placeholder:text-slate-600"
              />
              {isLoading ? (
                <Loader2 size={18} className="text-blue-500 animate-spin" />
              ) : (
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
              {results.length > 0 ? (
                <div className="p-2">
                  {results.map((result, idx) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => handleSelect(result)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                        idx === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-lg ${idx === selectedIndex ? 'bg-white/20' : 'bg-white/5'}`}>
                          {getIcon(result.type)}
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] font-black uppercase tracking-tight leading-none mb-1">{result.title}</p>
                          <p className={`text-[9px] font-bold uppercase tracking-tighter ${idx === selectedIndex ? 'text-blue-100' : 'text-slate-500'}`}>
                            {result.subtitle}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                          idx === selectedIndex ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/10 text-slate-500'
                        }`}>
                          {result.tag}
                        </span>
                        <ChevronRight size={14} className={idx === selectedIndex ? 'text-white' : 'text-slate-700'} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : query.length >= 2 && !isLoading ? (
                <div className="p-12 text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">No records found for "{query}"</p>
                </div>
              ) : (
                <div className="p-8 flex flex-col items-center gap-4 opacity-30">
                   <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                      <Search size={20} className="text-slate-500" />
                   </div>
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Enter at least 2 characters to begin</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/5 bg-black/20 flex items-center justify-between">
               <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                     <span className="px-1.5 py-0.5 bg-white/10 rounded text-[8px] text-slate-400 font-bold">↑↓</span>
                     <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Navigate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                     <span className="px-1.5 py-0.5 bg-white/10 rounded text-[8px] text-slate-400 font-bold">ENTER</span>
                     <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Select</span>
                  </div>
               </div>
               <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">SYSGRID GLOBAL INDEX</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
