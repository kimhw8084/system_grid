import re

with open('frontend/src/components/shared/OperationalImportModal.tsx', 'r') as f:
    content = f.read()

# Find the start of the grid wrapper
grid_start = content.find('<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">')
if grid_start == -1:
    print("Could not find grid start")
    exit(1)

# Find the end of the scrollable area
scroll_end = content.find('<WorkspaceModalFooter', grid_start)
if scroll_end == -1:
    print("Could not find scroll end")
    exit(1)

# We need to extract the cards. Let's find each WorkspaceSectionCard exactly.
def extract_card(title):
    match = re.search(r'(<WorkspaceSectionCard>[\s\S]*?<WorkspacePanelTitle>'+title+r'</WorkspacePanelTitle>[\s\S]*?</WorkspaceSectionCard>)', content)
    if not match:
        # Check for collapsible header for Template
        match = re.search(r'(<WorkspaceSectionCard>\s*<WorkspaceCollapsibleHeader[\s\S]*?title="'+title+r'"[\s\S]*?</WorkspaceSectionCard>)', content)
    return match.group(1) if match else None

source_card = extract_card('Source')
simulation_card = extract_card('Simulation')
template_card = extract_card('Template')

if not all([source_card, simulation_card, template_card]):
    print("Could not extract all cards")
    exit(1)

# Now, we need to modify Simulation card to include Validation popout button.
# Let's find the header of Simulation
sim_header_match = re.search(r'(<div className="flex flex-wrap items-center justify-between gap-4">\s*<div>\s*<WorkspacePanelTitle>Simulation</WorkspacePanelTitle>\s*<WorkspacePanelSubtitle>Normalized rows, row selection, and final commit set.</WorkspacePanelSubtitle>\s*</div>)', simulation_card)

# Insert the Validation popout button next to the Validate Preview button inside the Simulation card
validation_button = """
                      <div className="flex flex-wrap items-center gap-2">
                        {preview && (
                          <div className="relative">
                            <button
                              type="button"
                              ref={(node) => {
                                validationTriggerRef.current = node
                              }}
                              onClick={() => setIsValidationPopoutOpen((current) => !current)}
                              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-[10px] font-black transition-colors ${
                                previewErrorCount > 0
                                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15'
                                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15'
                              }`}
                            >
                              <AlertCircle size={12} />
                              Validation Report ({previewErrorCount} error{previewErrorCount === 1 ? '' : 's'})
                            </button>
                            {isValidationPopoutOpen && typeof document !== 'undefined' && createPortal(
                              <div
                                ref={validationPanelRef}
                                style={validationPanelStyle}
                                className="z-[3600]"
                              >
                                <WorkspaceFloatingPanel kind="detail" className="p-4 space-y-4">
                                  <div className="flex items-center justify-between gap-4">
                                    <p className="text-[11px] font-black text-white">Validation Report</p>
                                    <button
                                      type="button"
                                      onClick={() => setIsValidationPopoutOpen(false)}
                                      className="text-slate-400 hover:text-white"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2">
                                    <div className="rounded-lg border border-white/5 bg-black/20 px-2 py-2 text-center">
                                      <p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-500">Rows</p>
                                      <p className="mt-1 text-sm font-black text-white">{preview.total_rows}</p>
                                    </div>
                                    <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-2 py-2 text-center">
                                      <p className="text-[8px] font-black uppercase tracking-[0.1em] text-emerald-400">Valid</p>
                                      <p className="mt-1 text-sm font-black text-emerald-300">{preview.valid_rows}</p>
                                    </div>
                                    <div className="rounded-lg border border-rose-500/10 bg-rose-500/5 px-2 py-2 text-center">
                                      <p className="text-[8px] font-black uppercase tracking-[0.1em] text-rose-400">Invalid</p>
                                      <p className="mt-1 text-sm font-black text-rose-300">{preview.invalid_rows}</p>
                                    </div>
                                    <div className="rounded-lg border border-blue-500/10 bg-blue-500/5 px-2 py-2 text-center">
                                      <p className="text-[8px] font-black uppercase tracking-[0.1em] text-blue-400">Select</p>
                                      <p className="mt-1 text-sm font-black text-blue-300">{selectedImportCount}</p>
                                    </div>
                                  </div>
                                  <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                    {previewErrors.map((error) => (
                                      <div key={error} className="rounded-lg border border-rose-500/10 bg-rose-500/5 px-3 py-2 text-[9px] font-semibold text-rose-200">
                                        {error}
                                      </div>
                                    ))}
                                    {previewErrors.length === 0 && (
                                      <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-3 text-[9px] font-semibold text-emerald-300">
                                        All checked rows are valid and ready to import.
                                      </div>
                                    )}
                                  </div>
                                </WorkspaceFloatingPanel>
                              </div>,
                              document.body
                            )}
                          </div>
                        )}
"""

sim_buttons_match = re.search(r'(<button\s*type="button"\s*onClick=\{\(\) => previewMutation\.mutate\(\)\}[\s\S]*?</button>\s*</div>)', simulation_card)

if not sim_buttons_match:
    print("Could not find simulation buttons")
    exit(1)

new_sim_buttons = validation_button + sim_buttons_match.group(1).replace('</div>', '</div>\n                      </div>')

simulation_card_modified = simulation_card[:sim_buttons_match.start()] + new_sim_buttons + simulation_card[sim_buttons_match.end():]

# Assemble the new structure
new_grid = f"""<div className="flex flex-col gap-6">
                {template_card}
                {source_card}
                {simulation_card_modified}
              </div>
            </div>

            """

content_modified = content[:grid_start] + new_grid + content[scroll_end:]

with open('frontend/src/components/shared/OperationalImportModal.tsx', 'w') as f:
    f.write(content_modified)

print("Rewrite successful")
