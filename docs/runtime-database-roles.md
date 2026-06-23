# Runtime Database Roles

`api/database` owns schema migrations. Runtime API services must connect with
separate least-privilege Postgres roles.

## Role Names

```text
api/auth        gracon_auth_app
api/admin       gracon_admin_app
api/documents   gracon_documents_app
api/signature   gracon_signature_app
api/institution gracon_institution_app
api/stamp       gracon_stamp_app
api/meetings    gracon_meetings_app
```

Generate one unique password per role:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

## Baseline SQL

Run this manually with the migration-owner connection, then replace each
`:password` value with the generated password for that role.

```sql
CREATE ROLE gracon_auth_app LOGIN PASSWORD :'gracon_auth_app_password';
CREATE ROLE gracon_admin_app LOGIN PASSWORD :'gracon_admin_app_password';
CREATE ROLE gracon_documents_app LOGIN PASSWORD :'gracon_documents_app_password';
CREATE ROLE gracon_signature_app LOGIN PASSWORD :'gracon_signature_app_password';
CREATE ROLE gracon_institution_app LOGIN PASSWORD :'gracon_institution_app_password';
CREATE ROLE gracon_stamp_app LOGIN PASSWORD :'gracon_stamp_app_password';
CREATE ROLE gracon_meetings_app LOGIN PASSWORD :'gracon_meetings_app_password';

GRANT CONNECT ON DATABASE neondb TO
  gracon_auth_app,
  gracon_admin_app,
  gracon_documents_app,
  gracon_signature_app,
  gracon_institution_app,
  gracon_stamp_app,
  gracon_meetings_app;

GRANT USAGE ON SCHEMA public TO
  gracon_auth_app,
  gracon_admin_app,
  gracon_documents_app,
  gracon_signature_app,
  gracon_institution_app,
  gracon_stamp_app,
  gracon_meetings_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO
  gracon_auth_app,
  gracon_admin_app,
  gracon_documents_app,
  gracon_signature_app,
  gracon_institution_app,
  gracon_stamp_app,
  gracon_meetings_app;

GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO
  gracon_auth_app,
  gracon_admin_app,
  gracon_documents_app,
  gracon_signature_app,
  gracon_institution_app,
  gracon_stamp_app,
  gracon_meetings_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO
  gracon_auth_app,
  gracon_admin_app,
  gracon_documents_app,
  gracon_signature_app,
  gracon_institution_app,
  gracon_stamp_app,
  gracon_meetings_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO
  gracon_auth_app,
  gracon_admin_app,
  gracon_documents_app,
  gracon_signature_app,
  gracon_institution_app,
  gracon_stamp_app,
  gracon_meetings_app;
```

These roles must not own tables and must not receive `CREATE`, `ALTER`, `DROP`,
or migration privileges. Tighten table-level privileges service by service once
the access map is fully audited.
