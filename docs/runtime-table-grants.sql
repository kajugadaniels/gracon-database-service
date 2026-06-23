-- Runtime table grants for Gracon API services.
--
-- Review before applying. Run manually with the migration-owner connection.
-- Runtime roles must not own tables and must not receive DDL privileges.

BEGIN;

-- Remove broad public access first.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

-- Schema usage for all runtime roles.
GRANT USAGE ON SCHEMA public TO
  gracon_auth_app,
  gracon_admin_app,
  gracon_documents_app,
  gracon_signature_app,
  gracon_institution_app,
  gracon_stamp_app,
  gracon_meetings_app;

-- api/auth write surface.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  users,
  user_preferences,
  citizen_identities,
  platform_ids,
  email_verification_tokens,
  password_reset_tokens,
  id_verifications,
  refresh_tokens,
  security_event_logs
TO gracon_auth_app;

-- api/admin control-plane write surface plus broad oversight reads.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO gracon_admin_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  admins,
  admin_refresh_tokens,
  admin_invite_tokens,
  admin_audit_logs
TO gracon_admin_app;

-- api/documents write surface.
GRANT SELECT ON
  users,
  user_preferences,
  citizen_identities,
  platform_ids,
  personal_certificates,
  institution_certificates
TO gracon_documents_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  documents,
  document_folders,
  document_collaborators,
  document_invitation_verification_sessions,
  document_access_audit_logs,
  document_versions,
  document_comments,
  document_signature_requests,
  document_templates
TO gracon_documents_app;

-- api/signature write surface.
GRANT SELECT ON
  users,
  citizen_identities,
  platform_ids,
  foreign_identities
TO gracon_signature_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  personal_signature_images,
  personal_key_pairs,
  personal_certificates,
  personal_certificate_requests,
  personal_certificate_access_policies,
  personal_signed_documents,
  personal_signature_verifications
TO gracon_signature_app;

-- api/institution write surface.
GRANT SELECT ON
  users
TO gracon_institution_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  institutions,
  institution_members,
  authority_resolutions,
  institution_stamp_images,
  institution_key_pairs,
  institution_certificates
TO gracon_institution_app;

-- api/stamp write surface.
GRANT SELECT ON
  users,
  personal_key_pairs,
  personal_certificates,
  institutions,
  institution_members,
  institution_key_pairs,
  institution_certificates
TO gracon_stamp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  institution_stamps,
  institution_stamp_verifications
TO gracon_stamp_app;

-- api/meetings write surface.
GRANT SELECT ON
  users,
  user_preferences
TO gracon_meetings_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  meetings,
  meeting_participants,
  meeting_invites,
  meeting_recordings,
  meeting_audit_logs
TO gracon_meetings_app;

-- Sequences for runtime writes.
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO
  gracon_auth_app,
  gracon_admin_app,
  gracon_documents_app,
  gracon_signature_app,
  gracon_institution_app,
  gracon_stamp_app,
  gracon_meetings_app;

COMMIT;
