# Audit And Monitoring

Audit logs are security records. They prove who did what, when, and from where,
without storing secrets or plaintext sensitive identifiers.

## Existing Audit Surfaces

```text
api/auth
  security_event_logs for login, verification, password, token, and rate-limit
  events.

api/admin
  admin_audit_logs for privileged admin actions.

api/documents
  document_access_audit_logs for document access, invitations, comments,
  signing, and reminder events.

api/meetings
  meeting_audit_logs for meeting lifecycle, invites, recordings, and provider
  state transitions.
```

## Required Audit Events

- Admin creation, invite resend, deactivation, and login.
- NID, PID, FIN, or passport decrypt attempts.
- Certificate approval, rejection, revocation, ban, and ban lift.
- Signature generation, key rotation, and signing proof creation.
- Institution key generation, authority grants, revocation, and certificate
  issuance.
- Stamp creation and verification proof creation.
- Meeting invite creation, gate completion, join, leave, recording start/stop,
  recording ready, and recording failure.
- Database seed execution, especially `SUPER_ADMIN` seed.

## Do Not Log

- Raw passwords, tokens, OTPs, invite tokens, private keys, JWTs, database URLs,
  SMTP credentials, AWS keys, or service bridge credentials.
- Plaintext NID, PID, FIN, passport numbers, or biometric data.
- Full request bodies for sensitive endpoints.

## Monitoring Signals

- Failed login spikes.
- Rate-limit spikes.
- Repeated OTP failures.
- Repeated invitation token failures.
- Any decrypt action without a reason.
- Any production seed attempt.
- Any runtime database role receiving DDL privileges.
