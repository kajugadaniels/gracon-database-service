# Backup And Recovery

Backups are part of database security. A secure system must survive accidental
deletes, bad migrations, credential compromise, and provider incidents.

## Neon Requirements

- Enable Point-in-Time Restore for production when the Neon plan supports it.
- Keep production branches protected from casual development use.
- Test restoring a production-like branch before you need it in an incident.
- Keep backup/restore permissions separate from runtime service credentials.

## Recovery Drill

Run this drill on a staging or disposable branch:

1. Record current migration status from `api/database`.
2. Restore a Neon branch to a known timestamp.
3. Apply pending migrations from `api/database`.
4. Run smoke tests for auth, admin, documents, signature, institution, stamp,
   and meetings.
5. Verify audit logs and signed/stamped proof records survived the restore.
6. Document restore duration and any manual steps.

## Incident Rules

- If a runtime database password leaks, rotate only that service role first.
- If the migration-owner URL leaks, rotate it immediately and review recent
  schema changes.
- If a shared encryption secret leaks, treat affected encrypted data as exposed
  and plan service-specific rotation.
- If `SUPER_ADMIN_PASSWORD` leaks before bootstrap, rotate it before seeding.
  If it leaks after seeding, remove it from secret storage and rotate the
  actual admin password through the admin flow.
