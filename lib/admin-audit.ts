import type { PoolClient, Pool } from 'pg'

type AuditConnection = Pool | PoolClient

export type AdminAuditEntry = {
  actorId: string
  action: string
  entityType: 'profile' | 'payment_setting' | 'submission'
  entityId: string
  targetName: string
  summary: string
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  canRestore: boolean
  relatedEventId?: string
}

export async function writeAdminAudit(connection: AuditConnection, entry: AdminAuditEntry) {
  const { rows } = await connection.query(
    `INSERT INTO admin_audit_log (
       actor_id, actor_name, actor_email, action, entity_type, entity_id, target_name,
       summary, before_state, after_state, can_restore, related_event_id
     )
     SELECT id, name, email, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10
     FROM profiles
     WHERE id = $1
     RETURNING id`,
    [
      entry.actorId,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.targetName,
      entry.summary,
      entry.beforeState === null ? null : JSON.stringify(entry.beforeState),
      entry.afterState === null ? null : JSON.stringify(entry.afterState),
      entry.canRestore,
      entry.relatedEventId ?? null
    ]
  )

  if (!rows[0]) {
    throw new Error('Unable to record admin history because the acting account no longer exists.')
  }

  return String(rows[0].id)
}
