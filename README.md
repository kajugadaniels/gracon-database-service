<div align="center">

# Gracon Database Service

### Canonical PostgreSQL schema, migration authority, and shared Prisma client for Gracon 360

[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Shared%20Database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%20in%20CI-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](#license)

**Package:** `@gracon/database` · **Version:** `0.1.0` · **Module format:** CommonJS

</div>

> [!IMPORTANT]
> Despite the repository name, this is **not a network service**. It does not start a web server, expose HTTP endpoints, own business workflows, or listen on a port. It is the single database-ownership package used by the Gracon backend services.

> [!CAUTION]
> `DATABASE_MIGRATION_URL` is a privileged migration-owner credential. It belongs only in this project and must never be copied into a runtime API service.

---

## Table of Contents

- [Overview](#overview)
- [Why This Repository Exists](#why-this-repository-exists)
- [Responsibilities and Boundaries](#responsibilities-and-boundaries)
- [Architecture](#architecture)
- [Database Domains](#database-domains)
- [Key Data Invariants](#key-data-invariants)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Recommended Workspace Layout](#recommended-workspace-layout)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Package API](#package-api)
- [Using the Package from a Consumer Service](#using-the-package-from-a-consumer-service)
- [Database Migration Workflow](#database-migration-workflow)
- [Production Migration Runbook](#production-migration-runbook)
- [Seeding the First SUPER_ADMIN](#seeding-the-first-super_admin)
- [Runtime Database Roles](#runtime-database-roles)
- [Security Model](#security-model)
- [Command Reference](#command-reference)
- [Continuous Integration](#continuous-integration)
- [Operations, Monitoring, and Recovery](#operations-monitoring-and-recovery)
- [Known Integration Notes](#known-integration-notes)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

`gracon-database-service` is the canonical persistence package for the Gracon 360 backend. It centralizes:

- the complete Prisma schema;
- the ordered migration history;
- Prisma client generation;
- a shared PostgreSQL adapter factory;
- migration-safety and ownership checks;
- database security documentation;
- runtime-role and table-grant guidance; and
- the idempotent bootstrap seed for the first `SUPER_ADMIN`.

All backend services consume the same generated types and Prisma client through `@gracon/database`. They do **not** carry their own Prisma schemas, migrations, Prisma CLI dependencies, or migration credentials.

The package currently models **44 database models** and **29 enums** covering the major Gracon platform domains.

### At a Glance

| Property | Value |
|---|---|
| Package name | `@gracon/database` |
| Package visibility | Private workspace package |
| Database | PostgreSQL |
| ORM and migrations | Prisma 7 |
| PostgreSQL adapter | `@prisma/adapter-pg` |
| Source language | TypeScript |
| Compilation target | ES2022, CommonJS |
| Migration owner | `api/database` only |
| Seed responsibility | First `SUPER_ADMIN` only |
| HTTP interface | None |
| Runtime consumers | Auth, Admin, Documents, Signature, Institution, Stamp, Meetings |

---

## Why This Repository Exists

In a multi-service platform, allowing every service to own a copy of the shared schema creates several risks:

- migration order becomes ambiguous;
- services can generate incompatible Prisma clients;
- runtime credentials can accidentally gain DDL privileges;
- duplicated models drift over time;
- destructive schema changes can be triggered during application startup; and
- ownership of sensitive tables becomes unclear.

This repository establishes one authoritative database boundary:

1. **One schema owner** defines shared models and relations.
2. **One migration history** determines the order of database changes.
3. **One generated package** provides compatible Prisma types to every consumer.
4. **One privileged credential path** is used for deliberate migration operations.
5. **Separate runtime roles** limit the impact of a compromised service.
6. **Automated boundary checks** stop consumer services from reclaiming migration ownership.

---

## Responsibilities and Boundaries

### This Repository Owns

- `prisma/schema.prisma`, the canonical Gracon schema;
- `prisma/migrations/`, the canonical migration history;
- the Prisma migration lock file;
- Prisma client generation into `src/generated/prisma`;
- the public `@gracon/database` exports;
- the `PrismaPg` client factory;
- migration environment validation;
- consumer-boundary validation;
- database security baseline validation;
- runtime-role and table-grant documentation; and
- the first `SUPER_ADMIN` seed.

### This Repository Does Not Own

- authentication flows, JWT issuance, sessions, or password resets;
- admin application business logic;
- document editing, rendering, S3 uploads, or invitation workflows;
- certificate issuance logic or private-key cryptographic operations;
- institutional stamping workflows;
- meeting scheduling, Stream tokens, media transport, or recordings;
- HTTP controllers, guards, DTOs, Swagger, queues, or webhooks; or
- runtime service startup and deployment.

The schema describes data contracts for those workflows. The corresponding API service remains responsible for validating and enforcing its domain rules.

---

## Architecture

### Ownership and Runtime Access

```mermaid
flowchart LR
    subgraph ControlPlane[Database Control Plane]
        Schema[prisma/schema.prisma]
        Migrations[prisma/migrations]
        Seed[prisma/seed.ts]
        Guardrails[Boundary and security checks]
        Package[@gracon/database]
    end

    subgraph RuntimeServices[Runtime API Services]
        Auth[api/auth]
        Admin[api/admin]
        Documents[api/documents]
        Signature[api/signature]
        Institution[api/institution]
        Stamp[api/stamp]
        Meetings[api/meetings]
    end

    Migrator[Migration job or operator]
    PostgreSQL[(PostgreSQL / Neon)]
    SecretManager[Deployment secret manager]

    Schema --> Migrations
    Schema --> Package
    Migrator -->|DATABASE_MIGRATION_URL| Migrations
    Migrations --> PostgreSQL
    Seed -->|Migration-owner connection| PostgreSQL

    Package --> Auth
    Package --> Admin
    Package --> Documents
    Package --> Signature
    Package --> Institution
    Package --> Stamp
    Package --> Meetings

    SecretManager -->|Service-specific DATABASE_URL| RuntimeServices
    RuntimeServices -->|Least-privilege roles| PostgreSQL
    Guardrails -. verifies .-> RuntimeServices
```

### Schema Change Lifecycle

```mermaid
sequenceDiagram
    actor Developer
    participant Schema as Prisma Schema
    participant Prisma as Prisma CLI
    participant Migration as Migration History
    participant CI as CI Security Checks
    participant DB as PostgreSQL
    participant APIs as Consumer APIs

    Developer->>Schema: Edit canonical models
    Developer->>Prisma: npm run prisma:generate
    Prisma-->>Developer: Regenerate shared client and types
    Developer->>Prisma: npm run migrate:dev -- --name change_name
    Prisma->>Migration: Create reviewed SQL migration
    Developer->>CI: Push schema, migration, and package changes
    CI->>CI: Generate, type-check, security-check, build, audit
    Developer->>Prisma: npm run migrate:deploy
    Prisma->>DB: Apply pending migrations with owner role
    APIs->>DB: Continue using service-specific runtime roles
```

### Control Plane vs. Data Plane

| Plane | Credential | Purpose | Permitted operations |
|---|---|---|---|
| Database control plane | `DATABASE_MIGRATION_URL` | Schema migration, status, and database-owned seed | DDL and required DML |
| Runtime data plane | Service-specific `DATABASE_URL` | Normal application queries | Limited table-level DML; no DDL |

---

## Database Domains

The schema is deliberately organized by business domain. The table below is a practical map of the 44 models.

| Domain | Models | Purpose |
|---|---|---|
| Identity and authentication | `User`, `UserPreference`, `CitizenIdentity`, `PlatformId`, `EmailVerificationToken`, `PasswordResetToken`, `IdVerification`, `RefreshToken`, `SecurityEventLog` | Accounts, identity records, verification state, token persistence, user invitation defaults, and security-event evidence |
| Personal signatures and certificates | `PersonalSignatureImage`, `PersonalKeyPair`, `PersonalCertificate`, `PersonalCertificateRequest`, `PersonalCertificateAccessPolicy`, `PersonalSignedDocument`, `PersonalSignatureVerification` | User signing identities, certificate lifecycle, signing proofs, access sanctions, and verification history |
| Institutions and stamps | `Institution`, `InstitutionMember`, `AuthorityResolution`, `InstitutionStampImage`, `InstitutionKeyPair`, `InstitutionCertificate`, `InstitutionStamp`, `InstitutionStampVerification` | Institutional membership, delegated authority, certificates, dual-signature stamp proofs, and verification evidence |
| Administration | `Admin`, `AdminRefreshToken`, `AdminInviteToken`, `AdminAuditLog` | Separate administrator accounts, invitations, sessions, roles, and privileged-action audit history |
| Documents | `Document`, `DocumentFolder`, `DocumentCollaborator`, `DocumentInvitationVerificationSession`, `DocumentAccessAuditLog`, `DocumentVersion`, `DocumentComment`, `DocumentSignatureRequest`, `DocumentTemplate` | Document lifecycle, S3-backed content references, collaboration, invitation gates, versions, comments, signatures, and templates |
| Foreign identities | `ForeignIdentity`, `FinSequence` | Platform-managed identities for users without a Rwandan NID and race-safe FIN sequence allocation |
| Meetings | `Meeting`, `MeetingParticipant`, `MeetingInvite`, `MeetingRecording`, `MeetingAuditLog` | Gracon-owned meeting state, participant access, invitation verification, recording metadata, and audit history |

### High-Level Domain Relationships

```mermaid
flowchart TB
    User[User]
    Admin[Admin]
    Institution[Institution]
    Document[Document]
    Meeting[Meeting]

    User --> CitizenIdentity[Citizen Identity]
    User --> PlatformId[Platform ID]
    User --> IdVerification[ID Verification Attempts]
    User --> SecurityEvents[Security Events]

    User --> PersonalCertificate[Personal Certificate]
    PersonalCertificate --> SignedDocument[Personal Signed Document]
    PersonalCertificate --> SignatureVerification[Signature Verification Log]

    Institution --> InstitutionMember[Institution Member]
    Institution --> AuthorityResolution[Authority Resolution]
    Institution --> InstitutionCertificate[Institution Certificate]
    InstitutionMember --> InstitutionStamp[Institution Stamp]
    AuthorityResolution --> InstitutionStamp
    InstitutionCertificate --> InstitutionStamp

    User --> Document
    Document --> Collaborator[Collaborators and Invite Gates]
    Document --> Version[Versions]
    Document --> Comment[Comments]
    Document --> SignatureRequest[Signature Requests]
    Document --> AccessAudit[Access Audit Log]

    User --> Meeting
    Meeting --> Participant[Participants]
    Meeting --> Invite[Invites and Verification Gates]
    Meeting --> Recording[Recording Metadata]
    Meeting --> MeetingAudit[Meeting Audit Log]

    Admin --> AdminAudit[Admin Audit Log]
    Admin --> ForeignIdentity[Foreign Identity Registrations]
```

### Storage Boundaries

The database stores relational state and durable evidence, but several large or security-sensitive payloads live elsewhere.

| Data | Database responsibility | External responsibility |
|---|---|---|
| Document editor content and PDFs | Stores S3 object keys, hashes, layout, lifecycle state, and metadata | Object bodies are stored in S3 |
| Signature and stamp images | Stores private S3 references and metadata | Image objects are stored in S3 |
| Cryptographic keys | Stores public keys and encrypted private-key material or an HSM handle | Services perform cryptographic operations; production may use HSM/KMS |
| Signed and stamped documents | Stores document hashes, certificates, signature bytes, actors, and timestamps | Original document body remains outside this database package |
| Meetings | Stores Gracon permissions, schedules, invites, recording state, and audit logs | Stream provides live media transport and provider recording assets |
| Secrets | Stores no deployment secrets | Secret manager injects database URLs, JWT secrets, encryption secrets, SMTP credentials, and provider credentials |

---

## Key Data Invariants

The schema expresses important platform rules. Business services must continue enforcing them at runtime.

### Identity and Authentication

- `User.email` is unique.
- Citizen NID and FIN lookup hashes are unique while sensitive source values are represented by encrypted fields.
- Platform IDs are unique and one-to-one with a user.
- Refresh and reset tokens are stored as hashes rather than raw tokens.
- Security events may remain after a user is removed because the user relation uses `SetNull` where preservation is required.
- Invitation defaults are preferences only; they do not bypass the receiving service's access checks.

### Personal Certificates and Signatures

- Personal certificates bind a user identity to a key pair.
- Certificate serial numbers are unique.
- Certificate revocation is intended to be permanent.
- Signed-document rows are legal/audit evidence and are intended to be immutable.
- The database stores a document hash and signature proof, not the original document body.
- Handwritten signature images are decorative; cryptographic trust comes from certificates and signatures.

### Institutional Trust and Stamping

- Institutions are represented separately from users.
- Membership and stamp authority are traced through an `AuthorityResolution`.
- An institutional stamp records two signatures over the same document hash:
  1. the institution signature; and
  2. the acting user's personal signature.
- A stamp verification is successful only when both signatures are valid.
- Stamp proof and verification records are intended to remain auditable.

### Documents

The documented lifecycle is:

```text
DRAFT → FINALISED → SIGNED → LOCKED
```

- Drafts can be edited and versioned.
- Finalisation freezes content and records its hash.
- Signing must validate that the content still matches the finalised hash.
- A locked document is intended to be permanently immutable.
- Document deletion is soft deletion.
- Invitation tokens and OTP codes are represented by hashes.
- Collaborator permissions use an additive permissions array; the older role field remains for compatibility.
- Access, invitation, comment, signing, reminder, and locking events have dedicated audit types.

### Foreign Identities

- A Foreign Identity Number is a 16-digit platform identifier modeled after Rwanda's NIN structure.
- The first digit is fixed to the foreigner category.
- Birth year, gender code, sequence, issuance version, and checksum contribute to the FIN.
- `FinSequence` provides one sequence counter per birth-year and gender-code pair.
- Passport numbers are represented by encrypted values plus hashes for duplicate detection.
- Records use soft deactivation instead of hard deletion.

### Meetings

- Gracon owns meeting permissions and lifecycle state even when Stream provides media transport.
- Meeting invite tokens and OTPs are represented by hashes.
- Participants can represent internal users or external email invitees.
- Recording access must be authorized through meeting membership.
- Meeting lifecycle, invite gates, participants, recordings, and token issuance have an audit-event model.

---

## Technology Stack

| Technology | Role |
|---|---|
| TypeScript 6 | Package source, build-time checks, and safety scripts |
| Node.js | CLI and package runtime; CI currently uses Node 22 |
| Prisma 7 | Schema, migrations, generated client, and seed integration |
| PostgreSQL | Shared relational database |
| `@prisma/adapter-pg` | PostgreSQL driver adapter used by generated Prisma clients |
| `bcrypt` | Hashes the initial `SUPER_ADMIN` password during seeding |
| `tsx` | Executes TypeScript scripts without a separate compilation step |
| GitHub Actions | Generation, type checks, security checks, build, and dependency audit |
| Neon documentation | Recommended hosted PostgreSQL setup and restore workflow |

---

## Repository Structure

```text
.
├── .github/
│   └── workflows/
│       └── api-security.yml          # Database package CI security workflow
├── agents/                           # Project-local agent and ownership rules
├── docs/
│   ├── api-edge-hardening.md
│   ├── audit-and-monitoring.md
│   ├── backup-and-recovery.md
│   ├── ci-security-checks.md
│   ├── deployment-secret-map.md
│   ├── neon-first-clone-setup.md
│   ├── runtime-database-roles.md
│   ├── runtime-table-grants.sql
│   ├── secret-decoupling-roadmap.md
│   ├── service-to-service-auth.md
│   └── table-privilege-matrix.md
├── prisma/
│   ├── migrations/                   # Ordered canonical migration history
│   ├── schema.prisma                 # Authoritative shared schema
│   └── seed.ts                       # Idempotent first-SUPER_ADMIN seed
├── scripts/
│   ├── assert-consumer-boundary.ts   # Enforces database ownership across APIs
│   ├── assert-generated-client.ts    # Fails when Prisma client is missing
│   ├── assert-migration-env.ts       # Protects migration credential usage
│   └── assert-security-hardening.ts  # Verifies security baseline artifacts
├── src/
│   ├── database-url.util.ts          # Strict TLS URL normalization
│   ├── index.ts                      # Public package exports
│   ├── prisma-client.factory.ts      # Shared PrismaPg factory
│   └── generated/prisma/             # Generated by prisma:generate
├── .env.example
├── package.json
├── prisma.config.ts
├── SECURITY.md
├── tsconfig.json
└── tsconfig.scripts.json
```

> [!NOTE]
> `src/generated/prisma` is generated output. Do not hand-edit its files.

---

## Prerequisites

- **Node.js 22** is recommended to match CI.
- **npm** with lockfile support.
- Access to a **PostgreSQL** database.
- A direct, migration-capable PostgreSQL connection for schema operations.
- Service-specific PostgreSQL roles for runtime APIs.
- A workspace layout that places this repository at `api/database` when running cross-repository checks.

For Neon deployments, use:

- a **direct connection string** for `DATABASE_MIGRATION_URL`; and
- pooled service-specific connections for runtime `DATABASE_URL` values.

---

## Recommended Workspace Layout

The boundary and security scripts are intentionally aware of the wider Gracon API workspace. Use this layout when developing the database package alongside its consumers:

```text
gracon-workspace/
└── api/
    ├── database/       # this repository
    ├── auth/
    ├── admin/
    ├── documents/
    ├── signature/
    ├── institution/
    ├── stamp/
    └── meetings/
```

Example clone:

```bash
mkdir -p gracon-workspace/api
cd gracon-workspace/api

git clone https://github.com/kajugadaniels/gracon-database-service.git database
cd database
```

The package can still be generated, checked, and built in a standalone clone. However, `check:boundary` needs the sibling consumer repositories, and `check:security` expects the `api/database` workspace path used by CI.

---

## Quick Start

### 1. Install Dependencies

```bash
npm ci
```

### 2. Create a Local Environment File

```bash
cp .env.example .env
```

Add a direct PostgreSQL migration connection and the expected owner role:

```env
DATABASE_MIGRATION_URL=postgresql://gracon_migrator:replace_me@host/database?sslmode=verify-full
EXPECTED_MIGRATION_DATABASE_USER=gracon_migrator
```

### 3. Generate the Shared Prisma Client

```bash
npm run prisma:generate
```

### 4. Run Package Checks

```bash
npm run check
```

### 5. Build the Package

```bash
npm run build
```

### 6. Inspect Migration Status

```bash
npm run migrate:status
```

Do not apply migrations until you have confirmed the target database, branch, and migration-owner username.

---

## Environment Variables

### Database-Owner Variables

| Variable | Required for | Description |
|---|---|---|
| `DATABASE_MIGRATION_URL` | Migration status, migration development, migration deployment, seed | Direct PostgreSQL URL using the migration owner or dedicated migrator role |
| `EXPECTED_MIGRATION_DATABASE_USER` | Recommended for every privileged command | Exact PostgreSQL username the safety script expects in `DATABASE_MIGRATION_URL` |

### Bootstrap Seed Variables

| Variable | Required for | Description |
|---|---|---|
| `SUPER_ADMIN_FIRST_NAME` | `npm run db:seed` | Initial administrator's first name |
| `SUPER_ADMIN_LAST_NAME` | `npm run db:seed` | Initial administrator's last name |
| `SUPER_ADMIN_EMAIL` | `npm run db:seed` | Initial administrator's normalized email |
| `SUPER_ADMIN_PASSWORD` | `npm run db:seed` | Temporary plaintext bootstrap password; remove after successful production seed |

Example:

```env
DATABASE_MIGRATION_URL=postgresql://gracon_migrator:strong_password@host/database?sslmode=verify-full
EXPECTED_MIGRATION_DATABASE_USER=gracon_migrator

SUPER_ADMIN_FIRST_NAME=Super
SUPER_ADMIN_LAST_NAME=Admin
SUPER_ADMIN_EMAIL=superadmin@example.com
SUPER_ADMIN_PASSWORD=ReplaceWithAStrong1Password!
```

### Runtime Consumer Variables

Runtime APIs do not use the variables above. Each service receives only its own least-privilege URL:

```env
DATABASE_URL=postgresql://gracon_auth_app:unique_password@host/database?sslmode=verify-full
```

Never set a runtime API's `DATABASE_URL` to the migration-owner value.

---

## Package API

The package exports:

- the generated `PrismaClient`;
- all generated models, enums, input types, and Prisma namespace types;
- `createPrismaClient()`;
- `createPrismaClientOptions()`;
- `CreatePrismaClientOptions`; and
- `normalizeDatabaseUrl()`.

### Basic Client Creation

```ts
import { createPrismaClient } from '@gracon/database';

const prisma = createPrismaClient();

async function main(): Promise<void> {
  const activeUsers = await prisma.user.count({
    where: { isActive: true },
  });

  console.log({ activeUsers });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

By default, the factory reads `process.env.DATABASE_URL`.

### Supplying a Connection Explicitly

```ts
import { createPrismaClient } from '@gracon/database';

const prisma = createPrismaClient({
  connectionString: process.env.AUTH_DATABASE_URL,
});
```

### Passing Prisma Options

```ts
import { createPrismaClient } from '@gracon/database';

const prisma = createPrismaClient({
  prismaOptions: {
    log: ['warn', 'error'],
  },
});
```

### Creating Options for Dependency Injection

```ts
import {
  PrismaClient,
  createPrismaClientOptions,
} from '@gracon/database';

const prisma = new PrismaClient(
  createPrismaClientOptions({
    connectionString: process.env.DATABASE_URL,
    prismaOptions: {
      log: ['error'],
    },
  }),
);
```

### TLS URL Normalization

`normalizeDatabaseUrl()` protects strict TLS behavior. Unless `uselibpqcompat=true` is explicitly present, these legacy `sslmode` values are rewritten to `verify-full`:

- `prefer`;
- `require`; and
- `verify-ca`.

Example:

```text
postgresql://user:pass@host/db?sslmode=require
```

is normalized to a URL using:

```text
sslmode=verify-full
```

Malformed URLs are returned unchanged so the underlying PostgreSQL adapter can report the connection error.

---

## Using the Package from a Consumer Service

Consumer repositories use a sibling file dependency:

```json
{
  "dependencies": {
    "@gracon/database": "file:../database"
  }
}
```

They must not declare their own dependencies on:

- `prisma`;
- `@prisma/client`; or
- `@prisma/adapter-pg`.

They must also not contain:

- `prisma.config.ts`;
- `prisma/schema.prisma`;
- `prisma/migrations/`;
- scripts that run `prisma migrate`, `prisma db push`, or `prisma generate`; or
- direct imports from `@prisma/client`.

### NestJS-Style Provider Example

```ts
import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient, createPrismaClientOptions } from '@gracon/database';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super(
      createPrismaClientOptions({
        connectionString: process.env.DATABASE_URL,
        prismaOptions: {
          log: ['warn', 'error'],
        },
      }),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

The consumer's `DATABASE_URL` must use the role assigned to that service.

---

## Database Migration Workflow

### Creating a Schema Change

1. Update only `prisma/schema.prisma` in this repository.
2. Generate the client:

   ```bash
   npm run prisma:generate
   ```

3. Create a development migration:

   ```bash
   npm run migrate:dev -- --name describe_the_change
   ```

4. Review the generated SQL carefully.
5. Verify indexes, constraints, defaults, nullability, cascade behavior, and data-migration requirements.
6. Run package checks:

   ```bash
   npm run check
   npm run build
   ```

7. In the complete workspace, run:

   ```bash
   npm run check:boundary
   npm run check:security
   ```

8. Build and test all affected consumer services.
9. Commit the schema and migration together.

### Migration Rules

- Run `migrate:dev` only on local or disposable development databases.
- Run `migrate:deploy` for staging and production.
- Never use `prisma db push` for shared deployed environments.
- Never trigger migrations as a side effect of API startup.
- Never edit a migration that has already been applied to a shared environment.
- Prefer additive and backward-compatible changes during rolling deployments.
- Review destructive SQL explicitly before applying it.
- Coordinate schema removal with all consumer repositories.

### Backward-Compatible Deployment Pattern

For breaking changes, use expand-and-contract:

1. Add the new column, table, enum value, or relation without removing the old contract.
2. Deploy consumers that can read and write the new shape.
3. Backfill data when required.
4. Confirm all consumers have migrated.
5. Remove the old contract in a later migration.

---

## Production Migration Runbook

Run production migrations as a deliberate operator action or isolated migration job.

### Before Applying

- Confirm the selected provider project and database branch.
- Confirm the migration URL is direct rather than pooled.
- Confirm the migration username matches `EXPECTED_MIGRATION_DATABASE_USER`.
- Confirm the migration owner is different from every runtime role.
- Review pending migration SQL.
- Verify backup or point-in-time restore readiness.
- Notify owners of affected consumer services.

### Apply

```bash
npm ci
npm run prisma:generate
npm run check
npm run build
npm run migrate:status
npm run migrate:deploy
npm run migrate:status
```

### After Applying

- Re-apply or verify table-level grants for newly created tables.
- Run smoke tests for affected APIs.
- Verify audit-writing paths.
- Check application and database error rates.
- Record the migration result and operator.

> [!WARNING]
> Prisma migrations are not an automatic rollback system. For a failed production migration, prefer a reviewed forward fix or a provider-supported point-in-time restore according to the incident plan.

---

## Seeding the First SUPER_ADMIN

The database-owned seed creates the first `SUPER_ADMIN` account.

### Seed Properties

- It requires `DATABASE_MIGRATION_URL`.
- It requires all four `SUPER_ADMIN_*` variables.
- It is idempotent: if a `SUPER_ADMIN` already exists, it exits without creating another.
- It normalizes the email to lowercase and trims whitespace.
- It hashes the password with bcrypt using 12 rounds.
- It creates the administrator as active and verified.
- It does not use the normal admin invitation flow.

### Password Requirements

The password must contain:

- at least 8 characters;
- an uppercase letter;
- a lowercase letter;
- a number; and
- one of `@$!%*?&^#`.

Generate a bootstrap password:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Run the seed:

```bash
npm run db:seed
```

Immediately after a successful production bootstrap:

1. remove `SUPER_ADMIN_PASSWORD` from deployment secret storage;
2. store the administrator's operational credentials according to platform policy; and
3. verify the bootstrap action is auditable.

---

## Runtime Database Roles

Each runtime service uses a unique PostgreSQL role.

| Consumer | Runtime role | Primary write domain |
|---|---|---|
| `api/auth` | `gracon_auth_app` | Users, preferences, identities, verification, user tokens, security events |
| `api/admin` | `gracon_admin_app` | Admin accounts, admin tokens, invitations, and admin audit records |
| `api/documents` | `gracon_documents_app` | Documents, collaboration, invite gates, versions, comments, signatures, templates |
| `api/signature` | `gracon_signature_app` | Personal keys, certificates, signed-document proofs, verification logs |
| `api/institution` | `gracon_institution_app` | Institutions, members, resolutions, institutional keys and certificates |
| `api/stamp` | `gracon_stamp_app` | Institutional stamp proofs and verification logs |
| `api/meetings` | `gracon_meetings_app` | Meetings, participants, invites, recording metadata, and audit logs |

### Runtime Role Principles

- Use one unique password per role.
- Do not reuse the migration-owner password.
- Runtime roles must not own tables.
- Runtime roles must not receive `CREATE`, `ALTER`, or `DROP` privileges.
- Grant cross-domain `SELECT` only for a documented query path.
- Apply `docs/runtime-table-grants.sql` manually and review it after every schema expansion.
- Rotate only the affected service credential when one runtime password is exposed.

See:

- [`docs/runtime-database-roles.md`](./docs/runtime-database-roles.md)
- [`docs/table-privilege-matrix.md`](./docs/table-privilege-matrix.md)
- [`docs/runtime-table-grants.sql`](./docs/runtime-table-grants.sql)

---

## Security Model

This repository treats database ownership as a platform security boundary.

### 1. Migration Credential Isolation

`assert-migration-env.ts` refuses privileged commands when:

- `DATABASE_MIGRATION_URL` is missing;
- the migration URL is invalid;
- the username appears to be a runtime `_app` or read-only role;
- `DATABASE_MIGRATION_URL` equals `DATABASE_URL`; or
- the username does not match `EXPECTED_MIGRATION_DATABASE_USER`.

### 2. Consumer Ownership Enforcement

`assert-consumer-boundary.ts` verifies that known consumers:

- depend on `@gracon/database` as `file:../database`;
- do not declare Prisma CLI/client/adapter packages;
- do not contain a local Prisma schema, config, or migrations;
- do not run Prisma ownership commands;
- do not import Prisma directly from forbidden packages;
- do not document migration credentials in runtime environment templates;
- use the expected service-specific username in example database URLs; and
- ignore both dot-prefixed and non-dot environment filenames.

Use `BOUNDARY_CONSUMERS` to scope the check when CI has only selected sibling services available:

```bash
BOUNDARY_CONSUMERS=auth npm run check:boundary
```

or:

```bash
BOUNDARY_CONSUMERS=documents,meetings npm run check:boundary
```

### 3. Generated Client Enforcement

Builds and checks fail when the generated Prisma client is absent. Run:

```bash
npm run prisma:generate
```

before `npm run check` or `npm run build`.

### 4. Strict TLS Normalization

The client factory normalizes selected legacy SSL modes to `verify-full`, reducing the risk of encrypted-but-unverified database connections.

### 5. Secret Ownership

Shared secrets must have one canonical owner and be injected into consumers through deployment configuration. Do not create independent copies with the same purpose.

Key ownership examples:

- database migration secrets belong to this package;
- user JWT and identity encryption secrets belong to Auth;
- admin JWT secrets belong to Admin;
- personal-key encryption secrets belong to Signature; and
- institutional-key encryption secrets belong to Institution.

See [`docs/deployment-secret-map.md`](./docs/deployment-secret-map.md) and [`docs/secret-decoupling-roadmap.md`](./docs/secret-decoupling-roadmap.md).

### 6. Sensitive Data Handling

The schema contains fields designed for highly sensitive data. Consumer services are responsible for applying the correct cryptography and authorization before persistence.

Do not log:

- raw passwords;
- JWTs, refresh tokens, reset tokens, invites, or OTPs;
- database URLs;
- private keys or encryption secrets;
- SMTP, AWS, or service-bridge credentials;
- plaintext NID, PID, FIN, passport, or biometric data; or
- complete request bodies for sensitive routes.

### 7. Audit Preservation

The platform contains dedicated audit surfaces for:

- authentication and security events;
- administrator actions;
- document invitations and access;
- signature and stamp verification;
- meeting lifecycle and invite gates; and
- privileged identity and certificate operations.

Review [`SECURITY.md`](./SECURITY.md) before changing database privileges, secrets, audit-sensitive models, backup posture, or service boundaries.

---

## Command Reference

| Command | Purpose | Requires migration URL |
|---|---|---:|
| `npm run prisma:generate` | Generate the shared Prisma client and verify expected generated files | No |
| `npm run check` | Verify generated client and type-check package and scripts without emitting | No |
| `npm run check:boundary` | Validate sibling consumer repositories against database ownership rules | No, but requires workspace siblings |
| `npm run check:security` | Validate the cross-repository security baseline and required documents | No, but expects `api/database` workspace layout |
| `npm run build` | Compile `src` to `dist` and emit declarations and source maps | No |
| `npm run migrate:status` | Display migration status after validating migration credentials | Yes |
| `npm run migrate:dev` | Create and apply development migrations | Yes |
| `npm run migrate:deploy` | Apply pending migrations in staging or production | Yes |
| `npm run db:seed` | Create the first `SUPER_ADMIN` if none exists | Yes, plus seed variables |

### Typical Development Check

```bash
npm ci
npm run prisma:generate
npm run check
npm run build
```

### Full Workspace Check

```bash
npm run prisma:generate
npm run check
npm run check:boundary
npm run check:security
npm run build
npm audit --audit-level=high
```

---

## Continuous Integration

The included GitHub Actions workflow runs on pull requests and pushes to `main`.

It performs:

1. checkout into `api/database`;
2. Node.js 22 setup with npm caching;
3. `npm ci`;
4. shared Prisma client generation;
5. TypeScript and generated-client checks;
6. security baseline checks;
7. package build; and
8. `npm audit --audit-level=high`.

The workflow intentionally does not apply migrations or run the production seed.

Consumer CI workflows should checkout this repository beside the consumer so `file:../database` resolves correctly. See [`docs/ci-security-checks.md`](./docs/ci-security-checks.md).

### Recommended Additional CI Checks

- Prisma schema formatting and validation;
- migration SQL review gates for destructive statements;
- secret scanning with Gitleaks or the hosting provider;
- integration tests against a disposable PostgreSQL database;
- service-by-service smoke tests after applying migrations; and
- verification that newly added tables appear in the privilege matrix and grant SQL.

---

## Operations, Monitoring, and Recovery

### Monitoring Signals

Alert on:

- failed-login or rate-limit spikes;
- repeated OTP and invite-token failures;
- sensitive decryption activity without a recorded reason;
- any production seed attempt;
- any runtime role receiving DDL privileges;
- migration failures or unexpected drift;
- database connection failures by one service role; and
- missing audit records for privileged workflows.

### Backup and Recovery

For Neon deployments:

- enable point-in-time restore when supported;
- protect production branches from development use;
- separate restore permissions from runtime credentials;
- test restoration on a staging or disposable branch; and
- record restore duration and manual recovery steps.

A recovery drill should validate Auth, Admin, Documents, Signature, Institution, Stamp, and Meetings after restoration.

See:

- [`docs/audit-and-monitoring.md`](./docs/audit-and-monitoring.md)
- [`docs/backup-and-recovery.md`](./docs/backup-and-recovery.md)
- [`docs/neon-first-clone-setup.md`](./docs/neon-first-clone-setup.md)

---

## Known Integration Notes

### Foreign Identity Runtime Ownership

The Prisma schema includes `ForeignIdentity` and `FinSequence` under an `api/foreign-identity` domain. The current runtime-role list, consumer-boundary checker, deployment role map, and table-grant SQL enumerate seven consumers and do not yet define a dedicated foreign-identity runtime writer.

Before enabling a separate foreign-identity service in a least-privilege environment:

1. decide whether the domain is owned by `api/admin` or a dedicated service;
2. add the chosen runtime role and secret-manager entry;
3. update `assert-consumer-boundary.ts`;
4. update the runtime-role documentation;
5. grant reviewed access to `foreign_identities` and `fin_sequences`; and
6. extend CI and smoke tests.

Do not solve this by giving a runtime service migration-owner credentials.

### Bootstrap Password Generation

The seed enforces password composition at runtime. A generic `base64url` generator does not guarantee uppercase, lowercase, numeric, and accepted special characters in every result. Use the seed-specific generator in this README or validate a generated password before executing `db:seed`.

### Workspace-Aware Checks

- `check:boundary` expects sibling consumer repositories under the same `api` directory.
- `check:security` expects this repository at `api/database`, matching the GitHub Actions checkout path.
- Package generation, `check`, and `build` can run in a standalone clone.

### Private Local Package

`package.json` sets `private: true`, and consumers currently resolve the package with `file:../database`. There is no public npm publishing workflow in this repository.

### Runtime Tests

The current database CI focuses on generated-client integrity, TypeScript correctness, structural security checks, build output, and dependency auditing. Database integration tests against disposable PostgreSQL instances would provide stronger validation for migration behavior, constraints, grants, and seed idempotency.

### Manual Privilege Application

Runtime roles and grants are deliberately applied manually. Newly created tables do not automatically become usable by the owning runtime role unless the grant policy or default privileges are reviewed and updated.

---

## Troubleshooting

### “The shared Prisma client has not been generated yet”

Run:

```bash
npm run prisma:generate
```

Then retry `npm run check` or `npm run build`.

### “DATABASE_MIGRATION_URL environment variable is not set”

Copy the environment template and set a direct migration-owner connection:

```bash
cp .env.example .env
```

Do not substitute a runtime API's `DATABASE_URL`.

### “appears to be using a runtime database role”

The migration safety check detected an `_app` or read-only username. Replace it with the dedicated migration-owner connection.

### “expected migration role … received …”

`EXPECTED_MIGRATION_DATABASE_USER` does not match the username embedded in `DATABASE_MIGRATION_URL`. Verify that you selected the intended database and role before changing either value.

### `check:boundary` reports missing consumer projects

Run the repository in the recommended workspace layout or scope the check to consumers that are present:

```bash
BOUNDARY_CONSUMERS=auth,documents npm run check:boundary
```

### `check:security` reports required files as missing

Ensure this repository is checked out at:

```text
<workspace>/api/database
```

The security script resolves required documents from the workspace root.

### Consumer cannot resolve `@gracon/database`

Confirm:

- the repositories are siblings;
- the dependency is exactly `file:../database`;
- the database package has been generated and built; and
- the consumer lockfile was refreshed after linking the package.

### TLS or certificate connection errors

The package upgrades several SSL modes to `verify-full`. Confirm:

- the provider hostname matches its certificate;
- the connection string uses the correct host;
- the local trust store is valid; and
- `uselibpqcompat=true` is used only when compatibility behavior is deliberately required.

### Runtime service receives permission denied

Do not grant broad database ownership. Instead:

1. identify the exact table and operation;
2. confirm the query is part of the service's documented domain;
3. update the privilege matrix;
4. update and review `runtime-table-grants.sql`; and
5. apply the narrow grant with the migration-owner connection.

### Seed skips creation

The seed is idempotent and stops when any `SUPER_ADMIN` exists. Inspect the existing administrator rather than deleting or duplicating it casually.

---

## Contributing

### Schema Changes

Every schema pull request should include:

- the business reason for the change;
- affected services and owners;
- the Prisma schema update;
- a reviewed migration when persistence changes;
- expected backfill behavior;
- indexes for known query patterns;
- relation and deletion semantics;
- privilege-matrix and grant updates;
- security and audit implications;
- consumer compatibility notes; and
- local or CI verification results.

### Review Checklist

- [ ] Is this repository the correct owner for the data contract?
- [ ] Is the change backward-compatible with deployed consumers?
- [ ] Are sensitive fields encrypted, hashed, or externalized appropriately?
- [ ] Are unique constraints and indexes justified?
- [ ] Are `onDelete` behaviors deliberate?
- [ ] Does the owning runtime role receive only the required privileges?
- [ ] Do cross-service reads have a documented reason?
- [ ] Are audit records preserved where legally or operationally required?
- [ ] Has generated-client compatibility been checked in consumers?
- [ ] Is a recovery or backfill plan required?

### Never Include

- production database URLs;
- real user or administrator credentials;
- plaintext identity values;
- JWT or encryption secrets;
- private keys;
- provider credentials; or
- production data exports.

---

## Security Documentation

The repository includes focused operational guides:

| Document | Purpose |
|---|---|
| [`SECURITY.md`](./SECURITY.md) | Central security model and incident checklist |
| [`docs/runtime-database-roles.md`](./docs/runtime-database-roles.md) | Runtime role creation and baseline access |
| [`docs/table-privilege-matrix.md`](./docs/table-privilege-matrix.md) | Service ownership and cross-domain read policy |
| [`docs/runtime-table-grants.sql`](./docs/runtime-table-grants.sql) | Reviewed table-level grant script |
| [`docs/deployment-secret-map.md`](./docs/deployment-secret-map.md) | Canonical secret names and service injection map |
| [`docs/service-to-service-auth.md`](./docs/service-to-service-auth.md) | Internal API authentication guidance |
| [`docs/secret-decoupling-roadmap.md`](./docs/secret-decoupling-roadmap.md) | Plan for reducing shared encryption-secret access |
| [`docs/ci-security-checks.md`](./docs/ci-security-checks.md) | Required database and consumer CI checks |
| [`docs/audit-and-monitoring.md`](./docs/audit-and-monitoring.md) | Audit surfaces, prohibited log data, and alerts |
| [`docs/backup-and-recovery.md`](./docs/backup-and-recovery.md) | Restore drills and incident rules |
| [`docs/api-edge-hardening.md`](./docs/api-edge-hardening.md) | HTTP boundary controls owned by consumer APIs |
| [`docs/neon-first-clone-setup.md`](./docs/neon-first-clone-setup.md) | Initial Neon-oriented setup workflow |

---

## License

`package.json` declares the package license as **ISC**. The repository currently does not expose a root `LICENSE` file in its main file listing. Add the full license text before relying on the metadata for external distribution or reuse.

---

<div align="center">

**Gracon Database Service** — one schema, one migration authority, and least-privilege access for every runtime service.

</div>
