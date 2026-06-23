# API Database

Canonical database ownership package for the Gracon platform.

This project owns the shared Prisma schema, migrations, migration history, and
generated Prisma client used by the backend API services. It is intentionally
not a NestJS application and does not expose HTTP routes.

## Overview

- Runtime: TypeScript tooling and Prisma CLI only
- Database: shared Postgres via Prisma
- Migration owner: `api/database`
- Generated client package: `@gracon/database`
- Consumers: `api/auth`, `api/admin`, `api/signature`, `api/stamp`,
  `api/institution`, `api/documents`, and `api/meetings`

## What This Project Owns

- Canonical Prisma schema
- Prisma migrations
- Prisma migration lock file
- Shared generated Prisma client and types
- Shared PrismaPg client factory
- Database-owned seed scripts, including the first `SUPER_ADMIN`
- Database ownership documentation and agent rules

## What This Project Must Not Own

- User authentication, sessions, JWT issuance, or password reset flows
- Admin control-plane business logic
- Document lifecycle, S3 document bodies, invitation gates, or signing workflow
- Personal or institutional private-key handling
- Stream Video calls, meeting media tokens, or recording lifecycle
- HTTP controllers, guards, DTOs, Swagger, or app-specific modules

## Folder Structure

```text
api/database/
  agents/          project-local AI agent rules
  prisma/
    migrations/    canonical migration history
    schema.prisma  canonical shared Prisma schema
    seed.ts        database-owned seed entrypoint
  scripts/         safety checks used by package scripts
  src/
    generated/     Prisma client output after generation
    index.ts       public package exports
  package.json
  prisma.config.ts
```

## Environment

`api/database` is the only project that should receive a migration-capable
connection string.

```env
DATABASE_MIGRATION_URL=postgresql://gracon_migrator:password@host/db?sslmode=verify-full
EXPECTED_MIGRATION_DATABASE_USER=gracon_migrator
SUPER_ADMIN_FIRST_NAME=Super
SUPER_ADMIN_LAST_NAME=Admin
SUPER_ADMIN_EMAIL=superadmin@yourplatform.com
SUPER_ADMIN_PASSWORD=YourStr0ng!Password
```

Runtime services use their own least-privilege `DATABASE_URL` values. Do not
copy `DATABASE_MIGRATION_URL` into any API service. Set
`EXPECTED_MIGRATION_DATABASE_USER` when you want migration commands to fail
unless the migration URL uses that exact Postgres role.

## Secret Ownership

Environment variables can be injected into more than one service, but each
shared secret has one owner:

- `api/database` owns `DATABASE_MIGRATION_URL`,
  `EXPECTED_MIGRATION_DATABASE_USER`, and the database-owned `SUPER_ADMIN_*`
  seed variables.
- `api/auth` owns the user-domain `JWT_SECRET` and `ENCRYPTION_SECRET`.
- `api/admin` owns `ADMIN_JWT_SECRET`.
- `api/signature` owns `SIGNATURE_ENCRYPTION_SECRET`.
- `api/institution` owns `INSTITUTION_ENCRYPTION_SECRET`.
- Runtime services own only their runtime `DATABASE_URL`; those users must be
  least-privilege and migration-incapable.

When another service needs a shared secret, inject the owner's value into that
service under the key that service already validates. Do not create a second
independent value with the same purpose.

## Runtime Database Roles

Each API service must use a separate runtime Postgres role in `DATABASE_URL`:

- `api/auth`: `gracon_auth_app`
- `api/admin`: `gracon_admin_app`
- `api/documents`: `gracon_documents_app`
- `api/signature`: `gracon_signature_app`
- `api/institution`: `gracon_institution_app`
- `api/stamp`: `gracon_stamp_app`
- `api/meetings`: `gracon_meetings_app`

See [docs/runtime-database-roles.md](./docs/runtime-database-roles.md) for the
manual SQL setup. Generate a unique password for every role and never reuse the
migration-owner password.

## Local Commands

```bash
npm run prisma:generate
npm run check
npm run check:boundary
npm run build
npm run migrate:status
npm run migrate:dev
npm run migrate:deploy
npm run db:seed
```

Migration commands must be run manually and deliberately. Never run migrations
as a side effect of starting an API service.

`npm run check:boundary` verifies that consumer services depend on
`@gracon/database`, do not declare local Prisma CLI/client dependencies, do not
restore local schema or migration ownership files, and do not import Prisma
directly from `@prisma/client`. It also verifies consumer env templates do not
document migration credentials and consumer `.gitignore` files protect both
dot-env and no-dot env filenames.

## Consumer Usage

Consumer services import Prisma from this package:

```ts
import { PrismaClient, createPrismaClient } from '@gracon/database';
```

Services should construct clients with their own runtime `DATABASE_URL`. Runtime
database users should not have DDL privileges such as `CREATE`, `ALTER`, `DROP`,
or ownership of shared tables.

## Important Rules

- Change shared schema only in `api/database/prisma/schema.prisma`.
- Create and apply migrations only from `api/database`.
- Run `npm run prisma:generate` here after schema changes.
- Run `npm run check:boundary` after changing consumer database integration.
- Consumer services must not run `prisma migrate` or `prisma db push`.
- Keep generated Prisma output out of hand edits.
- Keep database roles least-privilege: migrator credentials are separate from
  runtime service credentials.
- Do not add app-service dependencies here unless the database package directly
  uses them.
