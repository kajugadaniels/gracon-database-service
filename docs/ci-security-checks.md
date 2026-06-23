# CI Security Checks

Every API project should pass a security-oriented CI path before merge or
deployment.

The repository workflow is `.github/workflows/api-security.yml`.

## Required Checks

From `api/database`:

```bash
npm ci
npm run prisma:generate
npm run build
npm run check:boundary
npm run check:security
npm audit --audit-level=high
```

From each consumer API:

```bash
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
- `npm audit fix --force` is not a CI step; review breaking dependency changes
  before applying them.
