import React, { useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { WorkspaceFloatingPanel } from "./OperationalWorkspacePrimitives";
import { computeRowActionGeometry } from "./OperationalRowActionGeometry";

const SECTION_HORIZONTAL_PADDING = 12;

export type OperationalRowActionSectionId = "quickAccess" | "followOptions" | "archive";
export type OperationalRowActionTone = "neutral" | "info" | "success" | "warning" | "danger";
export type OperationalRowActionVariant = "tile" | "inline";

export type OperationalRowActionItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  tone?: OperationalRowActionTone;
  variant?: OperationalRowActionVariant;
  onClick: () => void;
  disabled?: boolean;
  confirming?: boolean;
  confirmLabel?: string;
  ariaLabel?: string;
};

export type OperationalRowActionSectionModel = {
  id: OperationalRowActionSectionId;
  columns?: 1 | 2 | 3 | 4 | 5;
  items: OperationalRowActionItem[];
};

const SECTION_TITLE_MAP: Record<OperationalRowActionSectionId, string> = {
  quickAccess: "Quick access",
  followOptions: "Follow options",
  archive: "Archive",
};

const TONE_ICON_CLASS: Record<OperationalRowActionTone, string> = {
  neutral: "text-slate-400",
  info: "text-blue-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger: "text-rose-300",
};

export function OperationalRowActionMenu({
  meta,
  title,
  onClose,
  sections,
  cursorX,
  cursorY,
}: {
  meta: React.ReactNode;
  title: React.ReactNode;
  onClose: () => void;
  sections: OperationalRowActionSectionModel[];
  cursorX: number;
  cursorY: number;
}) {
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  const geometry = computeRowActionGeometry({
    sections,
    viewportWidth: typeof window !== "undefined" ? window.innerWidth : 1000,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 1000,
    cursorX,
    cursorY,
    measuredHeight
  });

  useLayoutEffect(() => {
    if (headerRef.current && bodyRef.current) {
        setMeasuredHeight(headerRef.current.offsetHeight + bodyRef.current.scrollHeight);
    }
  }, [sections, meta, title]);

  const menuContent = (
    <div 
        className="row-action-menu-container"
        style={{ 
            position: "fixed", 
            zIndex: 1115, 
            visibility: measuredHeight === null ? "hidden" : "visible",
            ...geometry.style 
        }}
    >
      <WorkspaceFloatingPanel
        kind="context"
        className="flex flex-col overflow-hidden"
        style={{
          width: "100%",
          maxHeight: geometry.style.maxHeight,
          boxSizing: "border-box",
        }}
      >
        <div ref={headerRef} className="flex-shrink-0 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400">Row actions</p>
            <p className="pt-1 text-[11px] font-semibold text-slate-100">{meta}</p>
            <p className="pt-1 text-[12px] text-slate-300">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            aria-label="Close row actions"
          >
            <X size={13} />
          </button>
        </div>
        <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar">
          {geometry.sections.map((section, sectionIdx) => (
            <React.Fragment key={section.id}>
              {section.showTitle && (
                <div className="px-1 py-1.5">
                  <p className="text-[10px] font-semibold text-slate-400">{SECTION_TITLE_MAP[section.id]}</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {section.rows.map((row, rowIdx) => (
                  <div
                    key={rowIdx}
                    className="flex gap-2"
                    style={{ width: `${geometry.actionSetWidth}px` }}
                  >
                    {row.items.map((item, itemIdx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.onClick}
                        disabled={item.disabled}
                        className={`flex flex-row items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all hover:bg-white/[0.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${item.confirming ? "bg-rose-600 animate-pulse" : ""}`}
                        style={{ width: `${row.buttonWidths[itemIdx]}px` }}
                      >
                        {React.createElement(item.icon, { size: 14, className: `flex-shrink-0 ${TONE_ICON_CLASS[item.tone ?? "neutral"]}` })}
                        <span className={`${row.allowWrap ? "whitespace-normal break-words" : "whitespace-nowrap"} text-slate-300`}>
                          {item.confirming ? (item.confirmLabel || "Confirm?") : item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {sectionIdx < geometry.sections.length - 1 && <div className="my-3 h-px bg-slate-800" />}
            </React.Fragment>
          ))}
        </div>
      </WorkspaceFloatingPanel>
    </div>
  );

  return createPortal(menuContent, document.body);
}
