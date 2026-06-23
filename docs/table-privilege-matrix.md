# Runtime Table Privilege Matrix

`api/database` owns migrations. Runtime services receive only the table access
they need for application work.

This matrix is intentionally conservative. Start with these grants, then tighten
further after observing real query paths in tests and logs.

## Roles

```text
api/auth        gracon_auth_app
api/admin       gracon_admin_app
api/documents   gracon_documents_app
api/signature   gracon_signature_app
api/institution gracon_institution_app
api/stamp       gracon_stamp_app
api/meetings    gracon_meetings_app
```

## Shared Read Tables

These tables are commonly read by several services to validate identity,
preferences, or ownership. Grant write access only to the owning service.

```text
users
user_preferences
citizen_identities
platform_ids
foreign_identities
institutions
institution_members
personal_certificates
institution_certificates
```

## Service Ownership

```text
api/auth
  Owns auth/session/security-event writes:
  users, user_preferences, citizen_identities, platform_ids,
  email_verification_tokens, password_reset_tokens, id_verifications,
  refresh_tokens, security_event_logs

api/admin
  Owns admin-control-plane writes:
  admins, admin_refresh_tokens, admin_invite_tokens, admin_audit_logs
  Reads operational tables for review, oversight, and reporting.

api/documents
  Owns document workflow writes:
  documents, document_folders, document_collaborators,
  document_invitation_verification_sessions, document_access_audit_logs,
  document_versions, document_comments, document_signature_requests,
  document_templates

api/signature
  Owns personal signature and certificate writes:
  personal_signature_images, personal_key_pairs, personal_certificates,
  personal_certificate_requests, personal_certificate_access_policies,
  personal_signed_documents, personal_signature_verifications

api/institution
  Owns institutional trust writes:
  institutions, institution_members, authority_resolutions,
  institution_stamp_images, institution_key_pairs, institution_certificates

api/stamp
  Owns stamping proof writes:
  institution_stamps, institution_stamp_verifications

api/meetings
  Owns meeting workflow writes:
  meetings, meeting_participants, meeting_invites,
  meeting_recordings, meeting_audit_logs
```

## Grant Policy

- Runtime roles never receive `CREATE`, `ALTER`, `DROP`, or table ownership.
- Runtime roles never receive migration-owner credentials.
- Tables owned by one service may be granted `SELECT` to another service only
  when that service has a documented query path.
- `api/admin` may need broad read access for oversight, but write access should
  remain limited to admin-control-plane and explicitly reviewed sanction flows.
- Apply grants manually from `api/database` after migrations, then verify with a
  smoke test for the affected service.
