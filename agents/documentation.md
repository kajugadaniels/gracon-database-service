# api/database Documentation Rules

Update `README.md` when database ownership, commands, generated-client exports,
environment variables, or migration flow changes.

Update `.env.example` for every new database-owned environment variable.

Update consumer service READMEs and agent guides when shared schema ownership or
Prisma import flow changes.

Schema comments should say `api/database` owns migrations. Consumer schema
mirrors, while they still exist, must say generate-only and never migrate.

