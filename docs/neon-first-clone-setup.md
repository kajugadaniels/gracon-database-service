# Neon First-Clone Database Setup

Use this guide when setting up the database package after cloning the project.

## What This Project Does

`api/database` owns Prisma schema generation, migrations, migration status, and
database-owned seeds. It is the only API project that should use a
migration-capable Neon connection string.

## 1. Copy Environment Template

```bash
cp .env.example .env
```

## 2. Add The Neon Migration URL

In the Neon Console, open your project, select the correct branch, click
**Connect**, and copy the **direct** connection string. Do not use the pooled
`-pooler` hostname for migrations.

```env
DATABASE_MIGRATION_URL=postgresql://neondb_owner:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require
EXPECTED_MIGRATION_DATABASE_USER=neondb_owner
```

If you use a dedicated migrator role, set
`EXPECTED_MIGRATION_DATABASE_USER` to that role name instead.

## 3. Install And Generate The Shared Client

```bash
npm install
npm run prisma:generate
npm run build
```

## 4. Apply Migrations

Only run migration commands from this project.

```bash
npm run migrate:status
npm run migrate:deploy
```

Use `migrate:dev` only for local development branches where creating new
migrations is intentional.

## 5. Create Runtime Roles

Create the runtime database roles for the API services before starting them.
Use the role guide:

```text
docs/runtime-database-roles.md
```

Runtime APIs must use pooled Neon `DATABASE_URL` values with service-specific
roles. They must not use `DATABASE_MIGRATION_URL`.

## 6. Seed The First SUPER_ADMIN

Set the seed variables only in this project:

```env
SUPER_ADMIN_FIRST_NAME=
SUPER_ADMIN_LAST_NAME=
SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PASSWORD=
```

Generate the password with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Then run:

```bash
npm run db:seed
```

Remove `SUPER_ADMIN_PASSWORD` from production secret storage after the first
seed succeeds.
