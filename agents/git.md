# api/database Git Rules

Codex must never run git commands automatically.

Present commands for the developer to copy and run.

## Path Rule

All paths must be relative to the `api/database` project root.

Correct:

```bash
git add "prisma/schema.prisma"
git commit -m "feat(database): add shared prisma client package"
```

Wrong:

```bash
git add "api/database/prisma/schema.prisma"
git commit -m "feat(database): add shared prisma client package"
```

## Commit Rules

- One file per `git add`.
- Never use `git add .`.
- Never use `git add -A`.
- Never include `cd api/database`.
- Never run `git push`.
- Use Conventional Commits.
- Keep one logical change per commit.

## Common Scopes

- `database` for package exports and shared client helpers.
- `prisma` for schema, migrations, generated-client setup, and seeds.
- `security` for migration credential and least-privilege hardening.
- `docs` for Markdown-only documentation updates.

