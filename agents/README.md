# api/database Agent Guide

This directory contains project-local execution rules for AI agents working in
`api/database`.

## Reading Order

1. Read `../README.md`.
2. Read this file.
3. Read the topic file that matches the task.
4. Inspect the actual source or Prisma files before editing.

## Topic Files

- [database-prisma.md](./database-prisma.md) - schema ownership, migrations, generated client, and seed rules.
- [security.md](./security.md) - migration credentials, least-privilege runtime roles, and sensitive data.
- [documentation.md](./documentation.md) - README, `.env.example`, and cross-service documentation rules.
- [testing.md](./testing.md) - validation and generation checks.
- [git.md](./git.md) - copy-paste commit command format for this project.

## Scope

These rules apply only inside `api/database`. If a change touches a consumer API,
read that service's README and agent guide too.

## Conflict Rule

Follow the stricter security rule when project-local rules disagree.

## Completion Rule

Before reporting completion, state whether this changed schema, migrations,
generated-client exports, seed behavior, documentation, or all of them.

