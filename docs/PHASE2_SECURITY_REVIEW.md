# Phase 2 development security notes

Scope: new local workspace provisioning, private sessions, provider doctor and acceptance tooling. This is a loopback development workbench, not production approval. Existing legacy-system findings remain in PROJECT_AUDIT.md.

## Checked boundaries

- No hardcoded live key/password/token was introduced. The real ignored .env leaves Gemini key/model IDs empty. Workspace secrets/passwords are generated, stored privately outside served roots and not printed.
- No .env/private workspace is tracked; backend .pipeline-data/ and root/backend env rules are ignored.
- Existing bcrypt password hashing and JWT protection remain active; fixture accounts are non-admin and receive no credits. Explicit provisioning is confined to a newly owned loopback development database and rejects production/external modes.
- Venue case data is validated, decoded and confined by resolved paths; references never become shell arguments or URL imports. Acceptance bearer sessions only target an exact loopback origin with redirects disabled.
- Per-run locks, atomic saved request bodies and exact job recovery preserve paid-operation boundaries. No generation occurs without explicit opt-in, budget and configured provider; no automatic approval is introduced.
- Health/report/provider failures omit credentials, raw model responses and image buffers. Online model checking only uses bounded metadata requests to the fixed Google API origin with a key header.
- Legacy auth, debug endpoints, external DB configuration, deployment CORS/HTTPS and customer billing were not rewritten in this phase. The isolated local endpoint binds 127.0.0.1.

## Existing dependency audit

A read-only npm audit on 18 October 2026 reported **29 inherited package findings: 2 critical, 15 high, 11 moderate, 1 low**. No dependency versions/lockfile were changed in Phase 2. The raw audit is in private `.pipeline-data/security/npm-audit.json`.

Critical package labels: `proxy-addr`, `websocket-driver`. High labels include existing direct `axios`, `form-data`, `multer`, `nodemon`, `sharp` and transitive packages. Audit severity is a registry finding, not proof that each issue is exploitable through this local workbench. These still require dependency remediation and regression testing before production/customer exposure. They are not marked fixed by passing pipeline tests or by a new-code review.

## Coverage assessment

- Access control: local fixture/auth/isolation tests implemented; whole legacy product not certified.
- Cryptography: generated signing secrets, existing password hashing and private files; no production key management change.
- Injection: new CLI paths/URLs/provider requests bounded and validated; legacy code remains separately audited.
- Misconfiguration: owned-local flags and loopback binding tested; deployment hardening remains Phase 6.
- Authentication: actual JWT API and persisted fixture identity tested; no new unauthenticated login endpoint.
- Logging: credential redaction and safe telemetry tested; production monitoring not implemented here.

Production risk remains elevated by inherited dependency/legacy issues.
