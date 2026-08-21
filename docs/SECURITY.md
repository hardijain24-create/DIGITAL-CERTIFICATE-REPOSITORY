# Security Policy

This document outlines the security architecture and validation protocols implemented in the Digital Certificate Repository System (DCRS).

## Authentication & Session Security
- **HttpOnly Cookies**: Authentication sessions use JWTs stored in secure, HttpOnly, SameSite strict cookies. Client-side scripts cannot access these tokens.
- **Middleware Protection**: Route access (under `/dashboard`, `/certificates`, `/upload`, `/profile`, and `/admin`) is strictly verified by server-side Next.js middleware, preventing unauthenticated access.
- **Role-Based Access Control (RBAC)**: Authorization is enforced server-side. Accessing admin APIs or routes requires the `admin` role in the JWT payload.

## Data Integrity & Cryptography
- **SHA-256 Hashing**: Every uploaded certificate has a cryptographic SHA-256 hash generated from its binary buffer. This hash acts as an immutable proof of document integrity.
- **Tamper Detection**: During verification, the document is re-hashed. Any alteration in content will result in a mismatched hash, indicating tampering.
- **Secure Password Hashing**: Passwords are encrypted using standard `bcryptjs` with a salt factor of 10.

## Cloud Storage Security
- **Asset Offloading**: Uploaded certificates are securely stored in Cloudinary with malware validation scans.
- **Storage Sanitization**: Deleting a certificate metadata entry automatically issues a removal command to Cloudinary, ensuring complete data destruction.
