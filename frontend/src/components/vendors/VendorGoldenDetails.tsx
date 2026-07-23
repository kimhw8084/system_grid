import React from 'react'
import { Globe } from 'lucide-react'
import { WorkspaceModal } from '../shared/WorkspaceModal'
import type { VendorTableRow } from './vendorGoldenTypes'

/** Base-layer dossier shell used by the golden root; rich contract/personnel editors remain mounted by the root's nested modal flow. */
export function VendorGoldenDetails({ vendor, onClose, children }: { vendor: VendorTableRow; onClose: () => void; children: React.ReactNode }) {
  return <WorkspaceModal isOpen onClose={onClose} size="workspace" title={vendor.name} subtitle={`Partner ID: ${vendor.id} · ${vendor.country || 'No Region'}`} icon={<Globe size={20} />}>{children}</WorkspaceModal>
}
