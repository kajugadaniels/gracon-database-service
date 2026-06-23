# Service-To-Service Authentication

Internal API calls must use explicit service credentials. User JWTs and admin
JWTs are not service credentials.

## Current Internal Boundary

`api/admin` calls internal certificate-review endpoints in `api/signature` using
Basic Auth:

```text
SIGNATURE_ADMIN_BRIDGE_USERNAME -> SIGNATURE_SERVICE_USERNAME
SIGNATURE_ADMIN_BRIDGE_PASSWORD -> SIGNATURE_SERVICE_PASSWORD
```

`api/signature` validates these credentials with constant-time comparison in
`ServiceBasicAuthService`.

## Rules

- Every internal endpoint must be hidden from Swagger.
- Every internal endpoint must authenticate before doing service work.
- Internal credentials must be unique per caller-to-service relationship.
- Internal credentials must not be reused as user, admin, database, SMTP, or docs
  credentials.
- Internal endpoints must write audit logs for approval, rejection, signing,
  stamping, and identity-sensitive actions.
- Internal errors must not leak credentials, tokens, private keys, or raw
  upstream responses.

## Required Pattern For New Internal Calls

1. Add caller-specific env variables to both services.
2. Validate the receiving service credentials at startup.
3. Compare credentials with constant-time comparison.
4. Keep the route out of public Swagger.
5. Rate-limit or otherwise throttle the internal route.
6. Write an audit event that names the caller service and target resource.
7. Add the credential names to `docs/deployment-secret-map.md`.

## Long-Term Target

Move from Basic Auth to signed internal tokens or mTLS once deployment supports
it. The first upgrade should protect the future `api/stamp` -> `api/signature`
and `api/stamp` -> `api/institution` signing boundaries.
