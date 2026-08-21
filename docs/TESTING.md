# Testing Plan & Guidelines

This document outlines the testing process to verify that the DCRS application runs correctly.

## Automated Verification
To run TypeScript compiler diagnostics, formatting checks, and Next.js builds:
```bash
# Verify TypeScript compilation
npx tsc --noEmit

# Run Next.js linting checks
npm run lint

# Run a full production build
npm run build
```

## Manual Verification Matrix

### 1. User Registration & Login Flow
- **Paths**: `/register`, `/login`
- **Actions**:
  1. Register a new user with standard password criteria (min 8 characters, uppercase, lowercase, number, symbol).
  2. Attempt login with incorrect credentials (should reject).
  3. Log in with the correct email and password. Confirm redirection to `/dashboard` and check that the HttpOnly `authToken` cookie exists.

### 2. Session Integrity & Route Guarding
- **Paths**: `/dashboard`, `/certificates`, `/upload`, `/profile`, `/admin`
- **Actions**:
  1. Copy your session cookie and log out.
  2. Attempt to navigate directly to any protected routes without the cookie (should redirect to `/login`).
  3. Attempt to access `/admin` using a non-admin account (should redirect to `/dashboard`).

### 3. Certificate Vault Operations (CRUD)
- **Paths**: `/upload`, `/certificates`
- **Actions**:
  1. Upload a PDF/image certificate document. Check that it uploads to Cloudinary and registers in MongoDB.
  2. View the certificate in detail, copy the generated ID and hash.
  3. Share the certificate with a recipient email specifying permission constraints.
  4. Revoke access from the recipient, verify they can no longer access it.
  5. Delete the certificate and confirm that it is soft-deleted in the database and fully removed from Cloudinary.

### 4. Public Integrity Verification
- **Path**: `/verify`
- **Actions**:
  1. Query verification using the Certificate ID (should return status details).
  2. Scan the QR code or verify using the SHA-256 hash.
  3. Verify a modified or tampered file (should detect mismatched hashes).
