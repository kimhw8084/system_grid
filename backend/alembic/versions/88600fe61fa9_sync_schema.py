"""Sync schema - baseline: create all tables

Revision ID: 88600fe61fa9
Revises:
Create Date: 2026-03-27 13:50:43.952129

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '88600fe61fa9'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables from scratch (baseline migration)."""
    op.create_table('sites',
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('facility_manager', sa.String(), nullable=True),
        sa.Column('contact_phone', sa.String(), nullable=True),
        sa.Column('cooling_capacity_kw', sa.Float(), nullable=True),
        sa.Column('power_capacity_kw', sa.Float(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index('ix_sites_id', 'sites', ['id'])
    op.create_index('ix_sites_name', 'sites', ['name'])

    op.create_table('subnets',
        sa.Column('network_cidr', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('vlan_id', sa.Integer(), nullable=True),
        sa.Column('gateway', sa.String(), nullable=True),
        sa.Column('dns_servers', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('network_cidr'),
    )
    op.create_index('ix_subnets_id', 'subnets', ['id'])
    op.create_index('ix_subnets_network_cidr', 'subnets', ['network_cidr'])

    op.create_table('settings_options',
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('label', sa.String(), nullable=True),
        sa.Column('value', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('metadata_keys', sa.JSON(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_settings_options_id', 'settings_options', ['id'])
    op.create_index('ix_settings_options_category', 'settings_options', ['category'])

    op.create_table('incident_logs',
        sa.Column('systems', sa.JSON(), nullable=True),
        sa.Column('impacted_device_ids', sa.JSON(), nullable=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('severity', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('start_time', sa.DateTime(), nullable=True),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('reporter', sa.String(), nullable=True),
        sa.Column('initial_symptoms', sa.Text(), nullable=True),
        sa.Column('impacts_json', sa.JSON(), nullable=True),
        sa.Column('impact_analysis', sa.Text(), nullable=True),
        sa.Column('trigger_event', sa.Text(), nullable=True),
        sa.Column('log_evidence', sa.Text(), nullable=True),
        sa.Column('mitigation_steps', sa.Text(), nullable=True),
        sa.Column('root_cause', sa.Text(), nullable=True),
        sa.Column('resolution_steps', sa.Text(), nullable=True),
        sa.Column('lessons_learned', sa.Text(), nullable=True),
        sa.Column('prevention_strategy', sa.Text(), nullable=True),
        sa.Column('timeline_json', sa.JSON(), nullable=True),
        sa.Column('todos_json', sa.JSON(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_incident_logs_id', 'incident_logs', ['id'])
    op.create_index('ix_incident_logs_title', 'incident_logs', ['title'])

    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('action', sa.String(), nullable=True),
        sa.Column('target_table', sa.String(), nullable=True),
        sa.Column('target_id', sa.String(), nullable=True),
        sa.Column('changes', sa.JSON(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_audit_logs_id', 'audit_logs', ['id'])

    op.create_table('data_flows',
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('nodes_json', sa.JSON(), nullable=True),
        sa.Column('edges_json', sa.JSON(), nullable=True),
        sa.Column('viewport_json', sa.JSON(), nullable=True),
        sa.Column('is_template', sa.Boolean(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_data_flows_id', 'data_flows', ['id'])
    op.create_index('ix_data_flows_name', 'data_flows', ['name'])

    op.create_table('devices',
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('system', sa.String(), nullable=True),
        sa.Column('environment', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('type', sa.String(), nullable=True),
        sa.Column('size_u', sa.Integer(), nullable=True),
        sa.Column('manufacturer', sa.String(), nullable=True),
        sa.Column('model', sa.String(), nullable=True),
        sa.Column('serial_number', sa.String(), nullable=True),
        sa.Column('asset_tag', sa.String(), nullable=True),
        sa.Column('part_number', sa.String(), nullable=True),
        sa.Column('os_name', sa.String(), nullable=True),
        sa.Column('os_version', sa.String(), nullable=True),
        sa.Column('management_ip', sa.String(), nullable=True),
        sa.Column('primary_ip', sa.String(), nullable=True),
        sa.Column('management_url', sa.String(), nullable=True),
        sa.Column('owner', sa.String(), nullable=True),
        sa.Column('business_unit', sa.String(), nullable=True),
        sa.Column('vendor', sa.String(), nullable=True),
        sa.Column('purchase_order', sa.String(), nullable=True),
        sa.Column('cost_center', sa.String(), nullable=True),
        sa.Column('purchase_date', sa.DateTime(), nullable=True),
        sa.Column('install_date', sa.DateTime(), nullable=True),
        sa.Column('warranty_end', sa.DateTime(), nullable=True),
        sa.Column('eol_date', sa.DateTime(), nullable=True),
        sa.Column('power_supply_count', sa.Integer(), nullable=True),
        sa.Column('power_max_w', sa.Float(), nullable=True),
        sa.Column('power_typical_w', sa.Float(), nullable=True),
        sa.Column('btu_hr', sa.Float(), nullable=True),
        sa.Column('depth', sa.String(), nullable=True),
        sa.Column('tool_group', sa.String(), nullable=True),
        sa.Column('fab_area', sa.String(), nullable=True),
        sa.Column('recipe_critical', sa.Boolean(), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('is_reservation', sa.Boolean(), nullable=True),
        sa.Column('reservation_info', sa.JSON(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_devices_id', 'devices', ['id'])
    op.create_index('ix_devices_name', 'devices', ['name'])
    op.create_index('ix_devices_system', 'devices', ['system'])
    op.create_index('ix_devices_serial_number', 'devices', ['serial_number'])
    op.create_index('ix_devices_asset_tag', 'devices', ['asset_tag'])

    op.create_table('rooms',
        sa.Column('site_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('floor_level', sa.String(), nullable=True),
        sa.Column('hvac_zone', sa.String(), nullable=True),
        sa.Column('fire_suppression_type', sa.String(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_rooms_id', 'rooms', ['id'])

    op.create_table('device_relationships',
        sa.Column('source_device_id', sa.Integer(), nullable=True),
        sa.Column('target_device_id', sa.Integer(), nullable=True),
        sa.Column('relationship_type', sa.String(), nullable=True),
        sa.Column('source_role', sa.String(), nullable=True),
        sa.Column('target_role', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['source_device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_device_relationships_id', 'device_relationships', ['id'])

    op.create_table('hardware_components',
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('manufacturer', sa.String(), nullable=True),
        sa.Column('specs', sa.String(), nullable=True),
        sa.Column('count', sa.Integer(), nullable=True),
        sa.Column('serial_number', sa.String(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_hardware_components_id', 'hardware_components', ['id'])

    op.create_table('device_software',
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('version', sa.String(), nullable=True),
        sa.Column('install_date', sa.DateTime(), nullable=True),
        sa.Column('purpose', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_device_software_id', 'device_software', ['id'])

    op.create_table('network_interfaces',
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('mac_address', sa.String(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('vlan_id', sa.Integer(), nullable=True),
        sa.Column('link_speed_gbps', sa.Integer(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('mac_address'),
    )
    op.create_index('ix_network_interfaces_id', 'network_interfaces', ['id'])
    op.create_index('ix_network_interfaces_mac_address', 'network_interfaces', ['mac_address'])
    op.create_index('ix_network_interfaces_ip_address', 'network_interfaces', ['ip_address'])

    op.create_table('port_connections',
        sa.Column('source_device_id', sa.Integer(), nullable=True),
        sa.Column('source_port', sa.String(), nullable=True),
        sa.Column('target_device_id', sa.Integer(), nullable=True),
        sa.Column('target_port', sa.String(), nullable=True),
        sa.Column('purpose', sa.String(), nullable=True),
        sa.Column('speed_gbps', sa.Float(), nullable=True),
        sa.Column('unit', sa.String(), nullable=True),
        sa.Column('direction', sa.String(), nullable=True),
        sa.Column('cable_type', sa.String(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['source_device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_port_connections_id', 'port_connections', ['id'])

    op.create_table('secret_vault',
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('secret_type', sa.String(), nullable=True),
        sa.Column('username', sa.String(), nullable=True),
        sa.Column('encrypted_payload', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_secret_vault_id', 'secret_vault', ['id'])

    op.create_table('maintenance_windows',
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('start_time', sa.DateTime(), nullable=True),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('ticket_number', sa.String(), nullable=True),
        sa.Column('coordinator', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_maintenance_windows_id', 'maintenance_windows', ['id'])

    op.create_table('monitoring_items',
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('spec', sa.Text(), nullable=True),
        sa.Column('platform', sa.String(), nullable=True),
        sa.Column('external_link', sa.String(), nullable=True),
        sa.Column('purpose', sa.Text(), nullable=True),
        sa.Column('notification_method', sa.String(), nullable=True),
        sa.Column('logic', sa.Text(), nullable=True),
        sa.Column('owner', sa.String(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_monitoring_items_id', 'monitoring_items', ['id'])
    op.create_index('ix_monitoring_items_category', 'monitoring_items', ['category'])
    op.create_index('ix_monitoring_items_status', 'monitoring_items', ['status'])

    op.create_table('logical_services',
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('service_type', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('version', sa.String(), nullable=True),
        sa.Column('environment', sa.String(), nullable=True),
        sa.Column('config_json', sa.JSON(), nullable=True),
        sa.Column('purchase_type', sa.String(), nullable=True),
        sa.Column('purchase_date', sa.DateTime(), nullable=True),
        sa.Column('expiry_date', sa.DateTime(), nullable=True),
        sa.Column('cost', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(), nullable=True),
        sa.Column('vendor', sa.String(), nullable=True),
        sa.Column('custom_attributes', sa.JSON(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_logical_services_id', 'logical_services', ['id'])
    op.create_index('ix_logical_services_name', 'logical_services', ['name'])
    op.create_index('ix_logical_services_service_type', 'logical_services', ['service_type'])

    op.create_table('service_secrets',
        sa.Column('service_id', sa.Integer(), nullable=True),
        sa.Column('username', sa.String(), nullable=True),
        sa.Column('password', sa.String(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['service_id'], ['logical_services.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_service_secrets_id', 'service_secrets', ['id'])

    op.create_table('racks',
        sa.Column('room_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('total_u_height', sa.Integer(), nullable=True),
        sa.Column('max_power_kw', sa.Float(), nullable=True),
        sa.Column('typical_power_kw', sa.Float(), nullable=True),
        sa.Column('max_weight_kg', sa.Float(), nullable=True),
        sa.Column('cooling_type', sa.String(), nullable=True),
        sa.Column('pdu_a_id', sa.String(), nullable=True),
        sa.Column('pdu_b_id', sa.String(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_racks_id', 'racks', ['id'])
    op.create_index('ix_racks_name', 'racks', ['name'])

    op.create_table('device_locations',
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('rack_id', sa.Integer(), nullable=True),
        sa.Column('start_unit', sa.Integer(), nullable=True),
        sa.Column('size_u', sa.Integer(), nullable=True),
        sa.Column('orientation', sa.String(), nullable=True),
        sa.Column('depth', sa.String(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['rack_id'], ['racks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_device_locations_id', 'device_locations', ['id'])


def downgrade() -> None:
    op.drop_table('device_locations')
    op.drop_table('racks')
    op.drop_table('service_secrets')
    op.drop_table('logical_services')
    op.drop_table('monitoring_items')
    op.drop_table('maintenance_windows')
    op.drop_table('secret_vault')
    op.drop_table('port_connections')
    op.drop_table('network_interfaces')
    op.drop_table('device_software')
    op.drop_table('hardware_components')
    op.drop_table('device_relationships')
    op.drop_table('rooms')
    op.drop_table('devices')
    op.drop_table('data_flows')
    op.drop_table('audit_logs')
    op.drop_table('incident_logs')
    op.drop_table('settings_options')
    op.drop_table('subnets')
    op.drop_table('sites')
