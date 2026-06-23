# Deployment Secret Map

Runtime services keep their existing environment variable names, but deployment
should source repeated values from one canonical secret. This avoids hand-copying
shared secrets between service env files.

## Canonical Secrets

```text
PLATFORM_USER_JWT_SECRET
  Inject as JWT_SECRET into api/auth, api/documents, api/signature,
  api/institution, api/stamp, and api/meetings.

PLATFORM_IDENTITY_ENCRYPTION_SECRET
  Inject as ENCRYPTION_SECRET into api/auth, api/admin, api/documents,
  and api/signature.

PLATFORM_SMTP_HOST
PLATFORM_SMTP_PORT
PLATFORM_SMTP_USER
PLATFORM_SMTP_PASS
  Inject as MAIL_HOST, MAIL_PORT, MAIL_USER, and MAIL_PASS into services
  that send email.

PLATFORM_AWS_REGION
PLATFORM_AWS_ACCESS_KEY_ID
PLATFORM_AWS_SECRET_ACCESS_KEY
PLATFORM_AWS_S3_BUCKET_NAME
  Inject as AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and
  AWS_S3_BUCKET_NAME into services that use S3.

FOREIGN_IDENTITY_BRIDGE_URL
FOREIGN_IDENTITY_BRIDGE_USERNAME
FOREIGN_IDENTITY_BRIDGE_PASSWORD
  Inject as FOREIGN_IDENTITY_SERVICE_URL, FOREIGN_IDENTITY_SERVICE_USERNAME,
  and FOREIGN_IDENTITY_SERVICE_PASSWORD into api/auth and api/signature.

SIGNATURE_ADMIN_BRIDGE_URL
SIGNATURE_ADMIN_BRIDGE_USERNAME
SIGNATURE_ADMIN_BRIDGE_PASSWORD
  Inject as SIGNATURE_SERVICE_URL, SIGNATURE_SERVICE_USERNAME, and
  SIGNATURE_SERVICE_PASSWORD into api/admin and api/signature as needed.

SIGNATURE_PRIVATE_KEY_ENCRYPTION_SECRET
  Owned by api/signature. Inject as SIGNATURE_ENCRYPTION_SECRET into
  api/signature and, until the stamping boundary is decoupled, api/stamp.

INSTITUTION_PRIVATE_KEY_ENCRYPTION_SECRET
  Owned by api/institution. Inject as INSTITUTION_ENCRYPTION_SECRET into
  api/institution and, until the stamping boundary is decoupled, api/stamp.
```

## Per-Service Secrets

Every service keeps its own runtime database URL with a unique app role:

```text
AUTH_DATABASE_URL        -> api/auth DATABASE_URL
ADMIN_DATABASE_URL       -> api/admin DATABASE_URL
DOCUMENTS_DATABASE_URL   -> api/documents DATABASE_URL
SIGNATURE_DATABASE_URL   -> api/signature DATABASE_URL
INSTITUTION_DATABASE_URL -> api/institution DATABASE_URL
STAMP_DATABASE_URL       -> api/stamp DATABASE_URL
MEETINGS_DATABASE_URL    -> api/meetings DATABASE_URL
```

Database-owner credentials stay separate:

```text
DATABASE_MIGRATION_URL
EXPECTED_MIGRATION_DATABASE_USER
SUPER_ADMIN_FIRST_NAME
SUPER_ADMIN_LAST_NAME
SUPER_ADMIN_EMAIL
SUPER_ADMIN_PASSWORD
```

`SUPER_ADMIN_PASSWORD` is temporary bootstrap material. Remove it from production
secret storage after the first seed succeeds.

## Rotation Rules

- Rotate production values independently from local development values.
- Never reuse a runtime database password across services.
- Never reuse migration-owner credentials as runtime credentials.
- Rotate any production secret that was ever copied into a local `.env` file.
- Do not add new consumers of private-key encryption secrets; use the
  decoupling roadmap instead.
