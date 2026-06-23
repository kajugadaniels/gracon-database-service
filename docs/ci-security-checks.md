# CI Security Checks

Every API project should pass a security-oriented CI path before merge or
deployment. Because each `api/*` project is an independent repository, the
workflow file belongs in that project's own `.github/workflows` directory.

The database repository workflow is `.github/workflows/api-security.yml` inside
`api/database`.

Each consumer repository also uses `.github/workflows/api-security.yml`. Consumer
workflows must checkout the database repository beside the service checkout so
the `file:../database` dependency can resolve. Configure these repository
settings in every consumer repository:

- Repository variable: `GRACON_DATABASE_REPOSITORY=owner/database-repo`
- Repository secret, for private database repositories:
  `GRACON_DATABASE_REPOSITORY_TOKEN`

## Required Checks

From `api/database`:

```bash
npm ci
npm run prisma:generate
npm run build
npm run check:security
npm audit --audit-level=high
```

From each consumer API:

```bash
BOUNDARY_CONSUMERS=<service-name> npm run check:boundary
npm ci
npm run build
npm test -- --runInBand
npm audit --audit-level=high
```

## Secret Scanning

Run one of these in CI:

```bash
gitleaks detect --source . --no-git --redact
```

or enable the hosting provider's built-in secret scanning. Treat any committed
real `.env`, private key, JWT secret, database URL, SMTP password, AWS key, or
service bridge credential as an incident that requires rotation.

## Notes

- Do not run migrations automatically in CI unless the target database is a
  disposable test database.
- Do not run production seeds in CI.
- `npm run check:boundary` checks all known consumers by default. Set
  `BOUNDARY_CONSUMERS` to a comma-separated list, such as `auth` or
  `documents,meetings`, when CI has only those service repositories checked out
  beside `api/database`.
- `npm audit fix --force` is not a CI step; review breaking dependency changes
  before applying them.
