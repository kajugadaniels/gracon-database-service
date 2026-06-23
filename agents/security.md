# api/database Security Rules

Purpose: protect the shared database by separating schema ownership from runtime
service access.

## Credentials

- `DATABASE_MIGRATION_URL` belongs only in `api/database`.
- Use `EXPECTED_MIGRATION_DATABASE_USER` when an environment has a known migration role name.
- Never copy migration credentials into `api/auth`, `api/admin`, or any other API service.
- Runtime services must use least-privilege `DATABASE_URL` credentials.
- Runtime roles should not own tables and should not have DDL privileges.

## Sensitive Data

- Do not log connection strings, passwords, tokens, encrypted identifiers, private keys, or seed passwords.
- Keep NID, FIN, PID, token, and private-key storage rules aligned with the owning service.
- Schema changes that affect sensitive data must preserve encryption, hashing, and audit requirements.

## Boundary

- This package owns schema and generated client only.
- Do not add HTTP routes, JWT handling, mail delivery, S3 access, Stream access, or business workflows here.
- Do not centralize service secrets in this package.

## Migration Safety

- Migration commands must be intentional, manual actions.
- Migration commands must fail if `DATABASE_MIGRATION_URL` is missing, invalid, points at an app or readonly role, or matches `DATABASE_URL`.
- Do not run destructive DDL without a reviewed migration and rollback plan.
- Do not edit deployed migration files; add a new migration instead.
