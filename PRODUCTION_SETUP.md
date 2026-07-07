# DCRS Production Setup Guide

Complete guide for deploying the Digital Certificate Repository System to production.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [MongoDB Atlas Setup](#mongodb-atlas-setup)
4. [Cloudinary Configuration](#cloudinary-configuration)
5. [Environment Variables](#environment-variables)
6. [Backend Deployment](#backend-deployment)
7. [Frontend Deployment](#frontend-deployment)
8. [Security Checklist](#security-checklist)
9. [Monitoring & Logs](#monitoring--logs)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│              (Responsive, Mobile-First UI)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP/HTTPS REST APIs
                       │
        ┌──────────────▼──────────────┐
        │   Next.js 16 Backend         │
        │  - Express.js API Routes    │
        │  - JWT Authentication       │
        │  - Role-Based Access        │
        │  - Input Validation         │
        │  - Error Handling           │
        └──────┬───────────────────┬──┘
               │                   │
        ┌──────▼──────┐    ┌──────▼────────┐
        │ MongoDB Atlas│    │ Cloudinary    │
        │             │    │               │
        │ - Users     │    │ - PDFs        │
        │ - Certs     │    │ - Images      │
        │ - Shares    │    │ - Folders     │
        │ - Logs      │    │ - Security    │
        └─────────────┘    └───────────────┘
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4
- **Components**: shadcn/ui (accessible components)
- **Animations**: Framer Motion
- **Forms**: React Hook Form
- **Charts**: Recharts
- **HTTP Client**: Axios/Fetch API
- **State**: React Context / SWR

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes (Express alternative)
- **Database**: MongoDB Atlas (Mongoose ODM)
- **File Storage**: Cloudinary (Free Tier)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Security**: Helmet, CORS, Rate Limiting
- **QR Codes**: qrcode library
- **Hashing**: Node.js crypto (SHA-256)

### Infrastructure
- **Hosting**: Vercel (Frontend + Backend)
- **Database Hosting**: MongoDB Atlas (Free/Paid)
- **File CDN**: Cloudinary (Free Tier)
- **Domain**: Custom domain via Vercel

---

## MongoDB Atlas Setup

### Step 1: Create MongoDB Atlas Account

1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Click "Sign Up" and create a free account
3. Verify email address

### Step 2: Create Free Cluster

1. Click "Create a Database"
2. Select "FREE" tier
3. Choose cloud provider: AWS
4. Select region closest to users
5. Click "Create Cluster"

Wait 2-3 minutes for cluster initialization.

### Step 3: Configure Network Access

1. Go to "Network Access" tab
2. Click "Add IP Address"
3. Select "Allow Access from Anywhere" (for development)
   - **Note**: In production, whitelist specific IPs
4. Click "Confirm"

### Step 4: Create Database User

1. Go to "Database Access" tab
2. Click "Add New Database User"
3. Username: `dcrs_user`
4. Password: Generate secure password (save it!)
5. Click "Add User"

### Step 5: Get Connection String

1. Go to "Databases" tab
2. Click "Connect" on your cluster
3. Select "Drivers"
4. Copy connection string
5. Replace `<username>` and `<password>` with credentials

Example:
```
mongodb+srv://dcrs_user:PASSWORD@cluster.mongodb.net/digital_certificate_repository?retryWrites=true&w=majority
```

### Step 6: Create Collections (Optional)

Collections are auto-created by Mongoose, but you can pre-create them:

```javascript
// Collections to create:
// - users
// - certificates
// - shares
// - verification_logs
// - activity_logs
// - notifications
```

---

## Cloudinary Configuration

### Step 1: Create Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up (free tier available)
3. Verify email

### Step 2: Get Credentials

1. Go to Dashboard
2. Note your **Cloud Name** (e.g., `dcrs_repo`)
3. Create API Key and Secret
   - Settings → API Keys
   - Create new key
   - Note: **API Key** and **API Secret**

### Step 3: Create Upload Preset

1. Settings → Upload
2. Create "Unsigned" upload preset named `dcrs_certificates`
3. Settings:
   - Folder: `digital_certificate_repository`
   - Resource Type: Image and Raw (for PDFs)
   - Max file size: 10 MB

### Step 4: Create Organization Folders

For better organization, create these folders in Cloudinary:

```
digital_certificate_repository/
├── academic/
├── professional/
├── internship/
├── training/
├── government/
├── identity/
├── license/
├── achievement/
├── workshop/
└── other/
```

---

## Environment Variables

### Create `.env.local` file

```env
# MongoDB
MONGODB_URI=mongodb+srv://dcrs_user:PASSWORD@cluster.mongodb.net/digital_certificate_repository?retryWrites=true&w=majority

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET=your_super_secret_jwt_key_generate_with_openssl
JWT_EXPIRY=7d

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
API_BASE_URL=https://yourdomain.com/api

# Email (Optional for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Generate JWT Secret

```bash
openssl rand -base64 32
```

### Environment Variables for Different Stages

#### Development (`.env.local`)
```env
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
CLOUDINARY_CLOUD_NAME=...
JWT_SECRET=dev_secret_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Production (Vercel Settings)

Set these in Vercel Dashboard → Project Settings → Environment Variables:

- `MONGODB_URI` (Production connection string)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `JWT_SECRET` (production-grade)
- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_URL=https://yourdomain.com`

---

## Backend Deployment

### Option 1: Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/dcrs.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import GitHub repository
   - Configure environment variables
   - Click "Deploy"

3. **Custom Domain**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS settings

### Option 2: Deploy to AWS/GCP

For more control, deploy to cloud providers:

**AWS (EC2)**:
```bash
# SSH into instance
ssh -i key.pem ubuntu@instance-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone <your-repo-url>
cd dcrs

# Install dependencies
npm install

# Set environment variables
nano .env.local

# Start server
npm start

# Use PM2 for process management
npm install -g pm2
pm2 start "npm start" --name "dcrs"
pm2 startup
pm2 save
```

---

## Frontend Deployment

Frontend is automatically deployed with the backend on Vercel.

If deploying separately:

1. Build optimized version:
   ```bash
   npm run build
   ```

2. Deploy to Vercel/Netlify:
   ```bash
   # Via Vercel CLI
   npm install -g vercel
   vercel deploy --prod

   # Or via Netlify
   netlify deploy --prod --dir=.next
   ```

---

## Security Checklist

### API Security
- [ ] Enable CORS with specific origins only
- [ ] Implement rate limiting (100 req/min)
- [ ] Validate all input (no SQL injection, XSS)
- [ ] Use parameterized queries
- [ ] Sanitize file uploads
- [ ] Implement request signing
- [ ] Use HTTPS only (redirect HTTP → HTTPS)
- [ ] Set security headers (Helmet.js)
- [ ] Implement CSRF protection

### Database Security
- [ ] Whitelist IP addresses in MongoDB Atlas
- [ ] Use strong passwords (20+ chars)
- [ ] Enable VPC endpoint (for production)
- [ ] Enable encryption at rest
- [ ] Enable encryption in transit
- [ ] Regular backups enabled
- [ ] Use database users with minimal privileges

### Cloudinary Security
- [ ] Secure unsigned upload preset
- [ ] Whitelist upload domains
- [ ] Set file size limits
- [ ] Set allowed file types
- [ ] Use API key for server-side operations
- [ ] Rotate API keys regularly
- [ ] Enable delete token for file removal

### Application Security
- [ ] JWT secrets use strong encryption
- [ ] Passwords hashed with bcrypt (10+ rounds)
- [ ] Secure session management
- [ ] Implement logout functionality
- [ ] Use secure cookies (HttpOnly, Secure, SameSite)
- [ ] Implement account lockout after failed attempts
- [ ] Email verification for new accounts
- [ ] 2FA for admin accounts
- [ ] Audit logs for sensitive operations

### Deployment Security
- [ ] Use HTTPS certificates (Let's Encrypt)
- [ ] Configure WAF (Web Application Firewall)
- [ ] Enable DDoS protection
- [ ] Regular security updates
- [ ] Patch management schedule
- [ ] Vulnerability scanning
- [ ] Penetration testing

---

## Monitoring & Logs

### Application Monitoring

1. **Vercel Analytics**
   - Monitor performance metrics
   - Track API response times
   - Monitor error rates

2. **MongoDB Monitoring**
   - Connection pool status
   - Query performance
   - Storage usage
   - Backup status

3. **Cloudinary Monitoring**
   - Upload/delivery metrics
   - Bandwidth usage
   - Error rates
   - Asset management

### Logging Strategy

Implement comprehensive logging:

```javascript
// Log levels: debug, info, warn, error
console.log("[DCRS-INFO] Certificate uploaded:", certificateId)
console.error("[DCRS-ERROR] Database connection failed:", error)
console.warn("[DCRS-WARN] High API latency detected")
```

### Error Tracking

Integrate Sentry for error tracking:

```bash
npm install @sentry/nextjs
```

### Performance Monitoring

1. Monitor Core Web Vitals:
   - LCP (Largest Contentful Paint) < 2.5s
   - FID (First Input Delay) < 100ms
   - CLS (Cumulative Layout Shift) < 0.1

2. API Performance:
   - /api/certificates: < 200ms
   - /api/verify: < 300ms
   - /api/dashboard: < 500ms

---

## Database Backups

### MongoDB Atlas Automatic Backups

1. Go to "Backup" tab in MongoDB Atlas
2. Enable "Automatic Backup"
3. Frequency: Daily (or hourly for production)
4. Retention: 7-30 days

### Manual Backup (if needed)

```bash
# Dump database
mongodump --uri "mongodb+srv://user:pass@cluster.mongodb.net/digital_certificate_repository" --out ./backup

# Restore database
mongorestore --uri "mongodb+srv://user:pass@cluster.mongodb.net/digital_certificate_repository" ./backup
```

---

## Scaling Considerations

### Horizontal Scaling
- Stateless API design (ready for multiple instances)
- Load balancing via Vercel
- Database read replicas (MongoDB Pro tier)

### Vertical Scaling
- Upgrade MongoDB cluster size
- Upgrade Cloudinary tier
- Increase Vercel concurrent function limit

### Caching Strategy
- Cache certificate metadata in Redis (optional)
- CDN caching for static assets
- Browser caching headers

---

## Disaster Recovery Plan

1. **Data Loss Prevention**
   - Daily automated MongoDB backups
   - Cloudinary file redundancy
   - Version control on GitHub

2. **Service Outage**
   - Failover to backup instances
   - DNS failover (multiple regions)
   - Incident response team

3. **Security Breach**
   - Immediate credential rotation
   - Security audit
   - User notification
   - Forensic investigation

---

## Support & Troubleshooting

### Common Issues

**MongoDB Connection Timeout**
```
Solution: Check IP whitelist, network connectivity, credentials
```

**Cloudinary Upload Failures**
```
Solution: Verify API credentials, check file size, check MIME type
```

**API 500 Errors**
```
Solution: Check logs, verify environment variables, restart backend
```

### Getting Help

- MongoDB Atlas Support: [support.mongodb.com](https://support.mongodb.com)
- Cloudinary Support: [cloudinary.com/support](https://cloudinary.com/support)
- Vercel Support: [vercel.com/help](https://vercel.com/help)
- GitHub Issues: Create issue in your repository

---

## Cost Estimation

### Free Tier (Perfect for College Project)

| Service | Plan | Cost | Notes |
|---------|------|------|-------|
| MongoDB Atlas | Free (M0) | $0 | 512 MB storage, good for learning |
| Cloudinary | Free | $0 | 25 GB storage, 25 GB bandwidth |
| Vercel | Hobby | $0 | Great for projects |
| GitHub | Free | $0 | Unlimited public/private repos |
| **Total** | | **$0** | Completely free! |

### Production Tier (If Scaling)

| Service | Plan | Cost | Notes |
|---------|------|------|-------|
| MongoDB Atlas | M10 | ~$57/month | More capacity, automated backups |
| Cloudinary | Plus | ~$99/month | More storage and bandwidth |
| Vercel | Pro | $20/month | Better performance |
| **Total** | | **~$176/month** | Enterprise-grade infrastructure |

---

## Final Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] Cloudinary account set up with folders
- [ ] Environment variables configured in Vercel
- [ ] GitHub repository connected to Vercel
- [ ] Automatic deployments enabled
- [ ] Custom domain configured
- [ ] HTTPS certificate active
- [ ] Monitoring and logging set up
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Database backups automated
- [ ] Team access configured
- [ ] Documentation updated
- [ ] Testing completed (unit, integration, E2E)
- [ ] Performance benchmarks established

**You're now ready to deploy DCRS to production!** 🚀
