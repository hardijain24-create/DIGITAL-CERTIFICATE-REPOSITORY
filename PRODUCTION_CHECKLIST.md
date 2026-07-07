# DCRS Production Deployment Checklist

This checklist ensures the Digital Certificate Repository System is properly configured for production deployment.

## Environment Variables

All required environment variables must be configured before deployment:

### Database Configuration
- [ ] `MONGODB_URI` - MongoDB Atlas connection string (must use TLS/SSL)
- [ ] Verify MongoDB user has minimal required permissions (read/write to collections only)
- [ ] Enable IP whitelist in MongoDB Atlas for production IPs only

### Authentication & Security
- [ ] `JWT_SECRET` - Generated with `openssl rand -base64 32` (never hardcoded)
- [ ] Use strong JWT_SECRET with at least 256 bits of entropy
- [ ] Rotate JWT_SECRET periodically (maintain old secret for grace period)
- [ ] `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- [ ] `CLOUDINARY_API_KEY` - Cloudinary API key
- [ ] `CLOUDINARY_API_SECRET` - Cloudinary API secret (never expose publicly)
- [ ] `NODE_ENV` - Set to "production"

### Optional Configuration
- [ ] `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- [ ] `VERCEL_URL` - Automatically set by Vercel
- [ ] Rate limit configuration in security.ts (customize as needed)

## Security Hardening

### Network Security
- [ ] Enable HTTPS/TLS for all connections (enforced via HSTS header)
- [ ] Configure CORS to only allow trusted origins
- [ ] Enable rate limiting (default: 100 requests per 15 minutes)
- [ ] Set up DDoS protection (use Vercel's built-in or Cloudflare)

### Application Security
- [ ] All JW secrets are environment variables (no hardcoded values)
- [ ] Input validation on all user-facing endpoints
- [ ] SQL injection prevention via parameterized queries (MongoDB)
- [ ] XSS protection via content sanitization
- [ ] CSRF protection via secure headers
- [ ] Secure password storage via bcrypt with salt rounds 10+

### API Security
- [ ] All sensitive endpoints require authentication (JWT verification)
- [ ] Role-based access control (RBAC) enforced on all protected routes
- [ ] Rate limiting per IP address
- [ ] Audit logging for all sensitive operations
- [ ] API versioning (optional) via URL path: /api/v1/...

### File Upload Security
- [ ] File MIME type validation (PDF, PNG, JPEG only)
- [ ] File extension whitelist enforcement
- [ ] File size limits enforced (10MB default, configurable)
- [ ] Malware extension blacklist prevents executable uploads
- [ ] Files stored in Cloudinary with virus scanning enabled
- [ ] Public file URLs use CDN with signed URLs (optional)

## Performance Optimization

### Frontend Optimization
- [ ] Next.js image optimization enabled
- [ ] Font optimization enabled
- [ ] Compression middleware enabled
- [ ] CSS/JS minification enabled (via Turbopack)
- [ ] Source maps disabled in production
- [ ] Browser caching headers configured

### Backend Optimization
- [ ] MongoDB indexes created for frequently queried fields
- [ ] Pagination enforced on all list endpoints (max 100 per page)
- [ ] Database connection pooling enabled
- [ ] Query optimization: avoid N+1 queries
- [ ] Response caching where appropriate (HTTP cache headers)
- [ ] Async operations for long-running tasks

### Database Optimization
- [ ] Indexes on: `userId`, `certificateId`, `isDeleted`, `createdAt`, `hash`
- [ ] Composite indexes for common query patterns
- [ ] TTL index on temporary data (if applicable)
- [ ] Regular index maintenance and analysis
- [ ] Database backups automated (MongoDB Atlas: daily snapshots)
- [ ] Query performance monitored via MongoDB Atlas

## Monitoring & Logging

### Application Monitoring
- [ ] Error tracking enabled (e.g., Sentry, LogRocket)
- [ ] Performance monitoring enabled (e.g., New Relic, Datadog)
- [ ] Uptime monitoring configured (ping /api/health every 5 minutes)
- [ ] Alert thresholds configured for errors, latency, and rate limits

### Logging
- [ ] Console logging configured for production
- [ ] Structured logging (JSON format) for parsing
- [ ] Sensitive data excluded from logs (passwords, tokens, API keys)
- [ ] Audit logs stored in MongoDB for compliance
- [ ] Activity logs stored with timestamps and user IDs
- [ ] Share and verification logs maintained for security

### Audit Trail
- [ ] All user actions logged to ActivityLog
- [ ] Certificate operations logged (upload, share, delete)
- [ ] Share events logged to ShareLog
- [ ] Verification events logged to VerificationLog
- [ ] Admin actions logged separately with elevated detail

## Deployment

### Vercel Deployment
- [ ] Environment variables configured in Vercel project settings
- [ ] Custom domain configured with SSL/TLS
- [ ] Automatic deployments enabled for main branch only
- [ ] Preview deployments enabled for feature branches
- [ ] Deployment notifications configured
- [ ] Rollback plan in case of critical issues

### Pre-Deployment Testing
- [ ] All environment variables configured locally
- [ ] npm run build succeeds without errors
- [ ] npm run dev runs without console errors
- [ ] Health check endpoint responds with all green
- [ ] Authentication flow tested end-to-end
- [ ] Certificate upload/download tested
- [ ] Sharing functionality tested
- [ ] Verification system tested
- [ ] Admin dashboard tested
- [ ] Role-based access control tested

## Post-Deployment

### Immediate Actions
- [ ] Verify all API endpoints responding (check /api/health)
- [ ] Verify database connectivity
- [ ] Verify Cloudinary integration
- [ ] Test user registration and login
- [ ] Test certificate upload and verification
- [ ] Monitor error rates and performance metrics
- [ ] Check for unexpected traffic or attacks

### Ongoing Maintenance
- [ ] Review logs daily for first week
- [ ] Monitor application performance metrics
- [ ] Perform security patches as released
- [ ] Rotate sensitive credentials quarterly
- [ ] Review and update CORS origins as needed
- [ ] Conduct security audit monthly
- [ ] Update dependencies via npm audit and renovate

## Disaster Recovery

### Backup Strategy
- [ ] MongoDB Atlas automated backups (daily)
- [ ] Cloudinary files have automatic versioning
- [ ] Code repository backed up to GitHub
- [ ] Environment variables backed up securely
- [ ] Backup restoration tested quarterly

### Incident Response
- [ ] Incident response plan documented
- [ ] Contact information for team members updated
- [ ] Rollback procedure documented and tested
- [ ] Communication plan for service outages
- [ ] Post-incident review process established

## Compliance & Privacy

### Data Protection
- [ ] GDPR compliance verified for EU users
- [ ] User data deletion functionality works
- [ ] Data retention policies implemented
- [ ] Encryption at rest for sensitive data (optional)
- [ ] Encryption in transit for all communications

### Audit Compliance
- [ ] All user actions are auditable
- [ ] Soft delete ensures data recovery capability
- [ ] Timestamps accurate and stored in UTC
- [ ] IP addresses logged for security events
- [ ] User consent for data collection documented

---

## Sign-Off

- [ ] Production Checklist Completed
- [ ] Date: _________________
- [ ] Reviewed By: _________________
- [ ] Approved By: _________________
