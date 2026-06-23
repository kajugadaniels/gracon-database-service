# API Security Hardening

This is the central security guide for the backend API projects.

`api/database` owns this guide because database ownership, migration power,
runtime roles, and shared Prisma access are the common security boundary for all
API services.

## Required Security Model

- `api/database` is the only migration owner.
- Runtime API services use separate least-privilege database roles.
- Shared secrets have one owner and are injected through the deployment secret
  map.
- Internal service calls use explicit service-to-service credentials.
- Audit logs record security-sensitive actions without storing secrets.
- Production secrets are managed by the deployment platform, not committed env
  files.
- Production recovery is tested through Neon restore drills.
- API edges enforce headers, CORS, validation, body limits, rate limits, and
  safe errors.

## Implementation Documents

- [Runtime database roles](./docs/runtime-database-roles.md)
- [Runtime table privilege matrix](./docs/table-privilege-matrix.md)
- [Runtime table grants SQL](./docs/runtime-table-grants.sql)
- [Deployment secret map](./docs/deployment-secret-map.md)
- [Service-to-service authentication](./docs/service-to-service-auth.md)
- [Secret decoupling roadmap](./docs/secret-decoupling-roadmap.md)
- [CI security checks](./docs/ci-security-checks.md)
- [Audit and monitoring](./docs/audit-and-monitoring.md)
- [Backup and recovery](./docs/backup-and-recovery.md)
- [API edge hardening](./docs/api-edge-hardening.md)

## Operational Checklist

Before production deploy:

1. Run migrations only from `api/database`.
2. Apply or verify runtime table grants.
3. Confirm every API uses its service-specific runtime database role.
4. Confirm production secrets are injected from the deployment secret map.
5. Run CI security checks.
6. Confirm Swagger is protected or disabled in production.
7. Confirm audit logs are written for the changed workflow.
8. Confirm Neon restore settings and the latest restore drill status.

## Incident Checklist

If a secret or runtime role is exposed:

1. Disable or rotate the affected credential.
2. Identify which services received the secret.
3. Review audit logs for suspicious use.
4. Rotate dependent tokens or encrypted material when required.
5. Re-apply least-privilege grants if database access changed.
6. Document the incident and add a regression check.
