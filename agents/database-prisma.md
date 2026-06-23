# api/database Database and Prisma Rules

`api/database` owns the canonical shared Prisma schema and migration lifecycle.

## Ownership Rules

- Run migrations from `api/database` only.
- Change shared schema only in `api/database/prisma/schema.prisma`.
- Generate the shared Prisma client from this project after schema changes.
- Consumer APIs import Prisma client and types from `@gracon/database`.
- Consumer APIs must not run `prisma migrate` or `prisma db push`.
- Do not hand-edit generated Prisma client output.
- Use `npm run check:boundary` to verify consumers have not regained local Prisma ownership.

## Migration Rules

- Do not run migrations automatically.
- Before adding a migration, explain the schema change, affected services, and rollback risk.
- Use `DATABASE_MIGRATION_URL` only in this project.
- Runtime service `DATABASE_URL` values must use least-privilege roles.
- Keep migration files append-only after they are shared or deployed.

## Query and Model Rules

- Preserve service ownership contracts when changing shared models.
- Add indexes for high-frequency lookup, filter, and ordering patterns before shipping dependent queries.
- Prefer compound indexes when a query filters and orders on the same path.
- Keep sensitive columns clearly named and mapped.

## Seed Rules

- Database-owned seeds belong in `api/database/prisma`.
- Seeds that create privileged accounts must be idempotent and environment-gated.
- Never run seeds against production unless the target environment and command are explicitly confirmed.
