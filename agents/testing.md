# api/database Testing Rules

## Validation

- Run `npm run prisma:generate` after changing `prisma/schema.prisma`.
- Run `npm run check` after changing TypeScript exports or scripts.
- Run `npm run check:boundary` after changing consumer Prisma dependencies, imports, package locks, or local Prisma folders.
- Run `npm run build` before publishing package changes to consumers.

## Migration Checks

- Use `npm run migrate:status` to inspect migration state.
- Do not run `migrate:dev`, `migrate:deploy`, or `db:seed` automatically.
- Ask for explicit human confirmation before any command that mutates a database.

## Consumer Checks

After changing generated-client exports, build each converted consumer service.
