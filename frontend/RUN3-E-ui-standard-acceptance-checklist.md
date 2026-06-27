# RUN3-E UI Standard Acceptance Checklist

## Verdict
[ ] Pass
[ ] Fail

## Golden Objective
Plug-and-play operational UI with maximum useful features, maximum sustainability, lowest bug risk, and “life-saver” user quality.

## Global UI Laws
- Buttons must not wrap text (use `whitespace-nowrap`).
- AgGrid cell values must not use italics.
- Row-action buttons must grow with long-title width (no wrapping).
- Outside click / Escape key must close modals/popovers.

## Monitoring Checklist
| Area | Step | Expected result | Failure if | Views to test | Evidence to capture |
|---|---|---|---|---|---|
| Monitoring | Navigate to view | UI loads instantly | Loading spinners hang | Monitoring | Screenshot |

## External Checklist
| Area | Step | Expected result | Failure if | Views to test | Evidence to capture |
|---|---|---|---|---|---|
| External | Navigate to view | UI loads instantly | Loading spinners hang | External | Screenshot |

## Services Checklist
| Area | Step | Expected result | Failure if | Views to test | Evidence to capture |
|---|---|---|---|---|---|
| Services | Navigate to view | UI loads instantly | Loading spinners hang | Services | Screenshot |

## Cross-View Zero-Divergence Checklist
| Area | Step | Expected result | Failure if | Views to test | Evidence to capture |
|---|---|---|---|---|---|
| Divergence | Compare views | All views look consistent | Styling differs | All | Screenshots |

## Row Action Layout Checklist
| Area | Step | Expected result | Failure if | Views to test | Evidence to capture |
|---|---|---|---|---|---|
| Layout | Hover action | Controls appear | Title wraps | All | Screenshot |
| Layout | Long title | Controls expand width | Title wraps | All | Screenshot |

## Bulk Behavior Checklist
| Area | Step | Expected result | Failure if | Views to test | Evidence to capture |
|---|---|---|---|---|---|
| Bulk | No-op update | No change, no revert toast | Revert toast shows | All | Log |
| Bulk | Actual update | Update succeeds | Error toast | All | Screenshot |
| Bulk | Partial update | Partial update succeeds | Error toast | All | Screenshot |

## Saved/Display View Checklist
| Area | Step | Expected result | Failure if | Views to test | Evidence to capture |
|---|---|---|---|---|---|
| Views | Switch views | View updates immediately | No update | All | Screenshot |

## Error/No-Error Checklist
| Area | Step | Expected result | Failure if | Views to test | Evidence to capture |
|---|---|---|---|---|---|
| Errors | Trigger error | Error toast appears | No feedback | All | Screenshot |

## Evidence Capture Rules
- All screenshots must show the full viewport and toast messages.
- All logs must be captured using browser console export.

## Release/Close Gate
No Done if:
- Any visible action can trigger known backend rejection.
- Any row-action title wraps.
- Long-title width does not apply to controls.
- Any no-op shows revert.
- Any actual update lacks working revert when reversible.
- Any purge shows revert.
- Any view diverges without approved exception.
