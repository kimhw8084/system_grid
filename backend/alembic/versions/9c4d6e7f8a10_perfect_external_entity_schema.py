"""perfect external entity schema

Revision ID: 9c4d6e7f8a10
Revises: 5b8f2a4c9d10
Create Date: 2026-06-04 18:10:00.000000
"""

from alembic import op
import sqlalchemy as sa
import json
import re


revision = "9c4d6e7f8a10"
down_revision = "5b8f2a4c9d10"
branch_labels = None
depends_on = None


def _slugify(value: str, entity_id: int | None = None) -> str:
    cleaned = re.sub(r"[^a-z0-9._:-]+", "-", (value or "").strip().lower()).strip("-")
    base = cleaned or "external-entity"
    return f"{base}-{entity_id}" if entity_id is not None else base


def upgrade() -> None:
    with op.batch_alter_table("external_entities", schema=None) as batch_op:
        batch_op.add_column(sa.Column("external_key", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("aliases_json", sa.JSON(), nullable=True, server_default="[]"))
        batch_op.add_column(sa.Column("subtype", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("ownership_mode", sa.String(), nullable=True, server_default="team"))
        batch_op.add_column(sa.Column("internal_team_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("internal_operator_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("notes", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("contacts_json", sa.JSON(), nullable=True, server_default="[]"))
        batch_op.add_column(sa.Column("business_purpose", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("criticality", sa.String(), nullable=True, server_default="Low"))
        batch_op.add_column(sa.Column("dependency_tier", sa.String(), nullable=True, server_default="Tier 3"))
        batch_op.add_column(sa.Column("data_classification", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("integration_mode", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("primary_endpoint_url", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("secondary_endpoint_url", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("auth_method", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("protocol_family", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("port_override", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("supports_inbound", sa.Boolean(), nullable=True, server_default=sa.false()))
        batch_op.add_column(sa.Column("supports_outbound", sa.Boolean(), nullable=True, server_default=sa.false()))
        batch_op.add_column(sa.Column("source_system", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("source_record_id", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("risk_rating", sa.String(), nullable=True, server_default="Low"))
        batch_op.add_column(sa.Column("contains_customer_data", sa.Boolean(), nullable=True, server_default=sa.false()))
        batch_op.add_column(sa.Column("contains_credentials", sa.Boolean(), nullable=True, server_default=sa.false()))
        batch_op.add_column(sa.Column("stores_pii", sa.Boolean(), nullable=True, server_default=sa.false()))
        batch_op.add_column(sa.Column("internet_exposed", sa.Boolean(), nullable=True, server_default=sa.false()))
        batch_op.add_column(sa.Column("third_party_assessment_status", sa.String(), nullable=True))
        batch_op.create_foreign_key(batch_op.f("fk_external_entities_internal_team_id_teams"), "teams", ["internal_team_id"], ["id"], ondelete="SET NULL")
        batch_op.create_foreign_key(batch_op.f("fk_external_entities_internal_operator_id_operators"), "operators", ["internal_operator_id"], ["id"], ondelete="SET NULL")
        batch_op.create_index(batch_op.f("ix_external_entities_external_key"), ["external_key"], unique=True)

    with op.batch_alter_table("external_entity_secrets", schema=None) as batch_op:
        batch_op.add_column(sa.Column("secret_label", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("secret_type", sa.String(), nullable=True, server_default="VaultReference"))
        batch_op.add_column(sa.Column("vault_provider", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("vault_path", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("credential_status", sa.String(), nullable=True, server_default="Active"))
        batch_op.add_column(sa.Column("rotation_frequency_days", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("password_last_rotated_at", sa.String(), nullable=True))

    with op.batch_alter_table("external_links", schema=None) as batch_op:
        batch_op.add_column(sa.Column("host_or_fqdn", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("path_or_resource", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("network_zone", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("transport_security", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("link_status", sa.String(), nullable=True, server_default="Active"))
        batch_op.add_column(sa.Column("credential_reference", sa.String(), nullable=True))

    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, name, owner_team, poc_json, metadata_json, type FROM external_entities")).mappings().all()
    for row in rows:
        metadata = row["metadata_json"] or {}
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except Exception:
                metadata = {}
        contacts = row["poc_json"] or []
        if isinstance(contacts, str):
            try:
                contacts = json.loads(contacts)
            except Exception:
                contacts = []
        migrated_contacts = []
        for index, contact in enumerate(contacts):
            full_name = " ".join(part for part in [contact.get("first_name"), contact.get("last_name")] if part).strip()
            migrated_contacts.append({
                "role": "Primary" if index == 0 else "Operational",
                "full_name": full_name or contact.get("id") or "Unspecified Contact",
                "email": contact.get("email"),
                "phone": contact.get("phone"),
                "external_person_id": contact.get("id"),
                "is_primary": index == 0,
                "is_escalation": False,
            })
        conn.execute(
            sa.text(
                """
                UPDATE external_entities
                SET external_key = :external_key,
                    contacts_json = :contacts_json,
                    business_purpose = :business_purpose,
                    criticality = :criticality,
                    dependency_tier = :dependency_tier,
                    integration_mode = :integration_mode,
                    primary_endpoint_url = :primary_endpoint_url,
                    auth_method = :auth_method,
                    source_system = :source_system,
                    source_record_id = :source_record_id,
                    ownership_mode = :ownership_mode
                WHERE id = :entity_id
                """
            ),
            {
                "entity_id": row["id"],
                "external_key": _slugify(row["name"], row["id"]),
                "contacts_json": json.dumps(migrated_contacts),
                "business_purpose": metadata.get("business_purpose"),
                "criticality": metadata.get("criticality") or "Low",
                "dependency_tier": metadata.get("dependency_tier") or "Tier 3",
                "integration_mode": "API" if row["type"] == "API" else None,
                "primary_endpoint_url": metadata.get("base_url"),
                "auth_method": metadata.get("auth_method") or metadata.get("auth_type"),
                "source_system": metadata.get("source_system"),
                "source_record_id": metadata.get("source_record_id"),
                "ownership_mode": "team",
            },
        )

    secret_rows = conn.execute(sa.text("SELECT id, username, note FROM external_entity_secrets")).mappings().all()
    for row in secret_rows:
        label = row["note"] or row["username"] or f"secret-{row['id']}"
        conn.execute(
            sa.text(
                """
                UPDATE external_entity_secrets
                SET secret_label = :secret_label,
                    secret_type = :secret_type,
                    credential_status = :credential_status
                WHERE id = :secret_id
                """
            ),
            {
                "secret_id": row["id"],
                "secret_label": label[:255],
                "secret_type": "SharedSecret",
                "credential_status": "Active",
            },
        )


def downgrade() -> None:
    with op.batch_alter_table("external_links", schema=None) as batch_op:
        batch_op.drop_column("credential_reference")
        batch_op.drop_column("link_status")
        batch_op.drop_column("transport_security")
        batch_op.drop_column("network_zone")
        batch_op.drop_column("path_or_resource")
        batch_op.drop_column("host_or_fqdn")

    with op.batch_alter_table("external_entity_secrets", schema=None) as batch_op:
        batch_op.drop_column("password_last_rotated_at")
        batch_op.drop_column("rotation_frequency_days")
        batch_op.drop_column("credential_status")
        batch_op.drop_column("vault_path")
        batch_op.drop_column("vault_provider")
        batch_op.drop_column("secret_type")
        batch_op.drop_column("secret_label")

    with op.batch_alter_table("external_entities", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_external_entities_external_key"))
        batch_op.drop_constraint(batch_op.f("fk_external_entities_internal_operator_id_operators"), type_="foreignkey")
        batch_op.drop_constraint(batch_op.f("fk_external_entities_internal_team_id_teams"), type_="foreignkey")
        batch_op.drop_column("third_party_assessment_status")
        batch_op.drop_column("internet_exposed")
        batch_op.drop_column("stores_pii")
        batch_op.drop_column("contains_credentials")
        batch_op.drop_column("contains_customer_data")
        batch_op.drop_column("risk_rating")
        batch_op.drop_column("source_record_id")
        batch_op.drop_column("source_system")
        batch_op.drop_column("supports_outbound")
        batch_op.drop_column("supports_inbound")
        batch_op.drop_column("port_override")
        batch_op.drop_column("protocol_family")
        batch_op.drop_column("auth_method")
        batch_op.drop_column("primary_endpoint_url")
        batch_op.drop_column("secondary_endpoint_url")
        batch_op.drop_column("integration_mode")
        batch_op.drop_column("data_classification")
        batch_op.drop_column("dependency_tier")
        batch_op.drop_column("criticality")
        batch_op.drop_column("business_purpose")
        batch_op.drop_column("contacts_json")
        batch_op.drop_column("notes")
        batch_op.drop_column("internal_operator_id")
        batch_op.drop_column("internal_team_id")
        batch_op.drop_column("ownership_mode")
        batch_op.drop_column("subtype")
        batch_op.drop_column("aliases_json")
        batch_op.drop_column("external_key")
