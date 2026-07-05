import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { AssetDetailsView } from './AssetDetailsView'
import AssetGoldenQuickLookPanel from './AssetGoldenQuickLookPanel'
import { AssetRecordFormModal, NetworkConnectionForm } from '../AssetReal'
import { BulkImportModal } from '../shared/BulkImportModal'
import { ConfirmationModal } from '../shared/ConfirmationModal'
import { WorkspaceModal } from '../shared/WorkspaceModal'
import { ToolbarButton } from '../shared/LayoutPrimitives'
import { ConfigRegistryModal } from '../ConfigRegistry'
import { ServiceDetailsView, ServiceForm } from '../ServiceRegistry'
import { apiFetch } from '../../api/apiClient'

function AssetServiceDialogs({
  activeDetails,
  activeEdit,
  devices,
  onCloseDetails,
  onCloseEdit,
  onRefresh,
  options,
}: any) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiFetch(`/api/v1/logical-services/${payload.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(await response.text())
      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['logical-services'] })
      toast.success('Service updated')
      onRefresh()
      onCloseEdit()
    },
    onError: (error: any) => toast.error(error?.message || 'Service update failed'),
  })

  return (
    <>
      <WorkspaceModal
        isOpen={Boolean(activeDetails)}
        onClose={onCloseDetails}
        size="workspace"
        title={activeDetails?.name || 'Service Details'}
        subtitle={activeDetails ? `${activeDetails.service_type} · ${activeDetails.environment}` : ''}
        icon={<Eye size={18} />}
        footerRight={<ToolbarButton onClick={onCloseDetails}>Close</ToolbarButton>}
      >
        {activeDetails ? <div className="pt-6"><ServiceDetailsView service={activeDetails} options={options} devices={devices} /></div> : null}
      </WorkspaceModal>

      <WorkspaceModal
        isOpen={Boolean(activeEdit)}
        onClose={onCloseEdit}
        size="workspace"
        title="Edit Service"
        subtitle="Service registry donor workflow"
      >
        {activeEdit ? (
          <div className="pt-6">
            <ServiceForm
              initialData={activeEdit}
              onSave={mutation.mutate}
              options={options}
              devices={devices}
            />
          </div>
        ) : null}
      </WorkspaceModal>
    </>
  )
}

export function AssetGoldenDialogs({
  detailAsset,
  detailLink,
  devices,
  editingAsset,
  editingLink,
  linkPurposeOptions,
  farmOptions,
  cableTypeOptions,
  onCloseDetails,
  onCloseEdit,
  onCloseLinkDetails,
  onCloseLinkEdit,
  onRefresh,
  options,
  quickLookAsset,
  setEditingAsset,
  setQuickLookAsset,
  setServiceDetails,
  setServiceEdit,
  showImportModal,
  showRegistryModal,
  serviceDetails,
  serviceEdit,
  setShowImportModal,
  setShowRegistryModal,
  confirmState,
  setConfirmState,
}: any) {
  return (
    <>
      {quickLookAsset ? (
        <AssetGoldenQuickLookPanel
          asset={quickLookAsset}
          onClose={() => setQuickLookAsset(null)}
          onEdit={(asset) => {
            setQuickLookAsset(null)
            setEditingAsset(asset)
          }}
        />
      ) : null}

      {detailAsset ? (
        <WorkspaceModal
          isOpen={true}
          onClose={onCloseDetails}
          size="workspace"
          title={detailAsset.name}
          subtitle={`${detailAsset.system} · ${detailAsset.type}`}
        >
          <div className="pt-6">
            <AssetDetailsView
              device={detailAsset}
              options={options}
              onViewServiceDetails={setServiceDetails}
              onEditService={setServiceEdit}
              onEditLink={onCloseLinkEdit}
              onViewLink={onCloseLinkDetails}
            />
          </div>
        </WorkspaceModal>
      ) : null}

      {editingAsset ? <AssetRecordFormModal item={editingAsset} onClose={onCloseEdit} onSuccess={onRefresh} /> : null}
      {editingLink ? (
        <NetworkConnectionForm
          item={editingLink}
          devices={devices}
          onClose={onCloseLinkEdit}
          onSuccess={onRefresh}
          linkPurposeOptions={linkPurposeOptions}
          farmOptions={farmOptions}
          cableTypeOptions={cableTypeOptions}
        />
      ) : null}
      {detailLink ? (
        <NetworkConnectionForm
          item={detailLink}
          devices={devices}
          onClose={onCloseLinkDetails}
          onSuccess={onRefresh}
          linkPurposeOptions={linkPurposeOptions}
          farmOptions={farmOptions}
          cableTypeOptions={cableTypeOptions}
        />
      ) : null}

      <AssetServiceDialogs
        activeDetails={serviceDetails}
        activeEdit={serviceEdit}
        devices={devices}
        onCloseDetails={() => setServiceDetails(null)}
        onCloseEdit={() => setServiceEdit(null)}
        onRefresh={onRefresh}
        options={options}
      />

      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        tableName="devices"
        displayName="Assets"
      />

      <ConfigRegistryModal
        isOpen={showRegistryModal}
        onClose={() => setShowRegistryModal(false)}
        title="Asset Registry Enumerations"
        sections={[
          { title: 'Asset Types', category: 'DeviceType', icon: Eye },
          { title: 'Logical Systems', category: 'LogicalSystem', icon: Eye },
          { title: 'Business Units', category: 'BusinessUnit', icon: Eye },
        ]}
      />

      <ConfirmationModal
        isOpen={Boolean(confirmState)}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
          confirmState?.onConfirm()
          setConfirmState(null)
        }}
        title={confirmState?.title || 'Confirm'}
        message={confirmState?.message || ''}
        confirmText="Confirm"
      />
    </>
  )
}
