# Secret Decoupling Roadmap

Some services currently share secrets because one service needs to validate or
operate on data owned by another service. Keep existing behavior working, but do
not expand this pattern.

## Current Shared Secrets

```text
JWT_SECRET
  Owned by api/auth.
  Consumers validate user tokens issued by api/auth.

ENCRYPTION_SECRET
  Owned by api/auth.
  Consumers that need recoverable identity fields receive the same value.

SIGNATURE_ENCRYPTION_SECRET
  Owned by api/signature.
  api/stamp receives it today so it can produce personal signing proof.

INSTITUTION_ENCRYPTION_SECRET
  Owned by api/institution.
  api/stamp receives it today so it can produce institutional stamping proof.
```

## Target Boundaries

- `api/auth` remains the only user-token issuer.
- `api/signature` becomes the only service that decrypts personal signing keys.
- `api/institution` becomes the only service that decrypts institutional keys.
- `api/stamp` requests signing operations through internal service APIs or KMS
  instead of receiving private-key derivation secrets.
- Shared identity decryption should be replaced gradually with narrowly scoped
  lookup/read APIs or purpose-specific hashes where possible.

## Implementation Path

1. Add internal signing endpoints to `api/signature` and `api/institution`.
2. Protect those endpoints with service-to-service credentials, rate limits, and
   audit logs.
3. Update `api/stamp` to request signing from those services instead of
   decrypting private keys locally.
4. Remove `SIGNATURE_ENCRYPTION_SECRET` and `INSTITUTION_ENCRYPTION_SECRET` from
   `api/stamp` env files.
5. Rotate both private-key encryption secrets after `api/stamp` no longer needs
   them.
6. Replace broad identity decryption sharing with service-owned APIs or hashed
   lookup paths.

## Guardrails

- Do not add a new service that reads `SIGNATURE_ENCRYPTION_SECRET`.
- Do not add a new service that reads `INSTITUTION_ENCRYPTION_SECRET`.
- Do not add a new service that decrypts identity values unless the owning
  service contract explicitly requires it.
- Every decoupling step must preserve audit evidence for signing, stamping,
  identity lookup, and administrative review.
