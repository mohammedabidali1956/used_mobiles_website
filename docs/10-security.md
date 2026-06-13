# docs/10-SECURITY-MODEL.md

# Security Model

---

## Authentication Architecture

### Mechanism
NextAuth.js v5 with the Credentials provider. Staff log in with email
and password. Sessions are managed as JWT tokens stored in an HttpOnly cookie.

### Password Security
- Passwords are hashed with bcrypt at cost factor 12 before storing.
- Bcrypt hash is stored in `users.password_hash`.
- Plain-text passwords are never stored, logged, or returned in any response.
- When comparing a login attempt: `bcrypt.compare(inputPassword, storedHash)`.

### Session Tokens
- JWT signed with a 64-character random secret stored in `NEXTAUTH_SECRET`
  environment variable.
- Token payload: `{ userId, email, role, name }`.
- Token expiry: 8h for STAFF, 24h for ADMIN/SUPER_ADMIN.
- Cookie flags: `HttpOnly: true, Secure: true, SameSite: Lax`.
- Tokens are re-verified against the database on all sensitive admin
  operations (role could have changed since login).

### Session Revocation
- Deactivating a user (`is_active = false`) does not immediately invalidate
  existing tokens in v1. The session expires naturally within 8–24 hours.
- For immediate revocation (v2), implement a token blocklist in Redis or a
  `session_version` field in the users table.

---

## Authorization Model

### Server-Side Enforcement
Every API route handler begins with:

```typescript
const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
if (!hasRequiredRole(session.user.role, requiredRole)) {
  return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
}
```

Client-side route guards in Next.js middleware are for UX (redirect to login).
They are not the security boundary. The API handler check is always authoritative.

### Role Checking Function
```typescript
const ROLE_HIERARCHY = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  STAFF: 2,
};

function hasRequiredRole(userRole: string, requiredRole: string): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
```

---

## Input Validation

### Strategy
All inputs are validated with Zod schemas before any business logic executes.
Zod schemas are defined in `src/schemas/` and are the single source of truth
for data shapes.

### Validation Points
1. Client-side: React Hook Form + Zod resolver (UX only — not trusted).
2. Server-side API route: Zod parse of request body/query params.
3. Database: Prisma type safety + DB constraints (CHECK, NOT NULL, UNIQUE).

If Zod validation fails on the server, return `400` with `VALIDATION_ERROR`
and the Zod error details. Never pass unvalidated input to Prisma.

### SQL Injection
Prisma parameterizes all queries. No raw SQL strings with user input are used.
If raw SQL is needed (e.g., full-text search), use Prisma's `$queryRaw` with
tagged template literals (automatically parameterized).

### XSS Prevention
- React escapes all string output by default. No `dangerouslySetInnerHTML`
  without explicit sanitization.
- Product descriptions that may contain HTML must be sanitized with
  `DOMPurify` on the server before storage and before rendering.

---

## Rate Limiting

Implemented via Vercel Edge Middleware using an in-memory sliding window.
For production scale, a Redis-backed rate limiter (Upstash) should be used.

| Endpoint Group          | Limit                   |
|-------------------------|-------------------------|
| POST /api/auth/signin   | 10 per IP per 15 min    |
| GET /api/products/*     | 120 per IP per minute   |
| GET /api/search         | 60 per IP per minute    |
| POST /api/billing/*     | 30 per user per minute  |
| POST /api/admin/*       | 60 per user per minute  |

---

## Data Exposure Controls

### Public API Field Projection
The public product response never includes:
- `cost_price`
- `internal_notes`
- `created_by` (user ID)
- `visibility_override` (internal flag)

Implemented by selecting only public fields in the Prisma query and using
Zod to strip any unexpected fields from the response before serialization.

### Admin API Field Projection
Admin API returns all fields including admin-only fields.
Staff billing search returns public + stock fields only (no cost_price).

---

## Environment Variable Security

- All secrets in environment variables (never in source code or committed files).
- `.env.local` is in `.gitignore`.
- `.env.example` contains all variable names with placeholder values (safe to commit).
- Variables used: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
  `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
  `SENTRY_DSN`.
- Vercel dashboard stores production environment variables encrypted.

---

## HTTPS and Headers

- All traffic is HTTPS via Vercel's automatic SSL.
- Security headers set in `next.config.ts`:
```typescript
  headers: [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Content-Security-Policy', value: '...' }, // restrict script-src
  ]
```

---

## Audit Trail

Every significant mutation is logged to `audit_logs` with:
- The user who performed the action
- The action type
- The entity affected
- A snapshot of data before and after (excluding sensitive fields)
- IP address and user agent

Audit logs cannot be deleted through the application UI. Deletion requires
direct database access (SUPER_ADMIN is informed of this policy).