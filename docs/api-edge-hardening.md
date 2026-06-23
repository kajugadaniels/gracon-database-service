# API Edge Hardening

Every API service must fail safely at the HTTP boundary before a request reaches
business logic.

## Required Controls

- Helmet security headers.
- Strict CORS allowlists. No wildcards with credentials.
- Global validation pipe with `whitelist`, `forbidNonWhitelisted`, and
  `transform`.
- JSON body size limits appropriate to the service.
- Rate limits for auth, OTP, public invitation, verification, and docs routes.
- Swagger disabled or protected in production.
- Safe exception filters that do not leak stack traces, SQL, secrets, object
  keys, provider responses, or internal IDs beyond the endpoint contract.

## Current Service Notes

```text
api/auth
  Helmet, strict CORS, 10kb JSON body limit, validation pipe, rate limits,
  production docs basic auth.

api/admin
  Helmet, strict CORS, 10kb JSON body limit, validation pipe, rate limits,
  production docs basic auth.

api/documents
  Helmet, strict CORS, content-size body limits, validation pipe, rate limits,
  Swagger disabled in production.

api/signature
  Helmet, strict CORS, validation pipe, rate limits, Swagger disabled in
  production.

api/institution
  Helmet, strict CORS, validation pipe, rate limits, Swagger disabled in
  production.

api/stamp
  Helmet, strict CORS, validation pipe, rate limits, Swagger disabled in
  production.

api/meetings
  Helmet, strict CORS, 25kb JSON body limit, validation pipe, Swagger disabled
  in production.
```

## Review Trigger

Review this checklist whenever adding a public route, file upload route,
webhook, internal route, invite route, OTP route, or endpoint that returns a
presigned URL.
