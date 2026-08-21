# DCRS API Documentation

Production-Ready Digital Certificate Repository System API

## Base URL

```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

---

## Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "role": "user"
}

Response: 201
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "user_123",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}

Response: 200
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "user_123",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### Certificates

#### List All Certificates
```http
GET /certificates?category=academic&status=verified&limit=20&offset=0
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "message": "Certificates fetched successfully",
  "data": [
    {
      "certificateId": "CERT_001",
      "certificateName": "AWS Solutions Architect",
      "issuer": "Amazon Web Services",
      "category": "professional",
      "verificationStatus": "verified",
      "fileUrl": "https://res.cloudinary.com/...",
      "hash": "abc123...",
      "qrCode": "https://api.qrserver.com/...",
      "analytics": {
        "downloads": 5,
        "views": 12,
        "shares": 2,
        "verificationCount": 3
      }
    }
  ]
}
```

#### Create Certificate
```http
POST /certificates
Content-Type: application/json
Authorization: Bearer <token>

{
  "certificateName": "AWS Solutions Architect",
  "issuer": "Amazon Web Services",
  "issuerWebsite": "https://aws.amazon.com",
  "category": "professional",
  "issueDate": "2024-01-15",
  "expiryDate": "2025-01-15",
  "ownerName": "John Doe",
  "ownerEmail": "john@example.com",
  "description": "Professional certification"
}

Response: 201
{
  "success": true,
  "message": "Certificate created successfully",
  "data": {
    "certificateId": "CERT_001",
    "hash": "abc123...",
    "qrCode": "https://api.qrserver.com/...",
    "verificationStatus": "pending"
  }
}
```

#### Get Certificate Details
```http
GET /certificates/123
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": { /* Certificate object */ }
}
```

#### Update Certificate
```http
PUT /certificates/123
Content-Type: application/json
Authorization: Bearer <token>

{
  "certificateName": "New Name",
  "description": "Updated description"
}

Response: 200
```

#### Delete Certificate
```http
DELETE /certificates/123
Authorization: Bearer <token>

Response: 200
```

#### Search Certificates
```http
GET /certificates/search?q=AWS&limit=20
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": [ /* Matching certificates */ ]
}
```

#### Get Categories
```http
GET /certificates/categories
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": [
    { "value": "academic", "label": "Academic" },
    { "value": "professional", "label": "Professional" },
    ...
  ]
}
```

---

### Verification

#### Verify Certificate
```http
POST /verify
Content-Type: application/json

{
  "certificateId": "CERT_001",
  "hash": "abc123...",
  "qrData": "CERT_001|john@example.com|AWS"
}

Response: 200
{
  "success": true,
  "message": "Certificate verification: verified",
  "data": {
    "verificationStatus": "verified",
    "certificateId": "CERT_001",
    "verificationMethod": "sha256_hash",
    "checks": {
      "certificateIdValid": true,
      "hashMatch": true,
      "notExpired": true,
      "notRevoked": true
    }
  }
}
```

#### Get Verification History
```http
GET /verify/CERT_001
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "totalVerifications": 5,
    "history": [
      {
        "verifiedAt": "2024-06-20T14:30:00Z",
        "verifiedBy": "admin@dcrs.io",
        "verificationStatus": "verified",
        "verificationMethod": "sha256_hash"
      }
    ]
  }
}
```

---

### Sharing

#### Share Certificate
```http
POST /certificates/share
Content-Type: application/json
Authorization: Bearer <token>

{
  "certificateId": "CERT_001",
  "sharedWith": "user@example.com",
  "permission": "view",
  "expiryDate": "2024-12-31"
}

Response: 201
{
  "success": true,
  "data": {
    "certificateId": "CERT_001",
    "sharedWith": "user@example.com",
    "permission": "view",
    "shareLink": "https://dcrs.example.com/shared/token123",
    "shareToken": "token123"
  }
}
```

#### Get Shared With Me
```http
GET /certificates/share
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": [
    {
      "certificateId": "CERT_001",
      "ownerId": "user_456",
      "sharedWith": "user_123",
      "permission": "view"
    }
  ]
}
```

---

### Dashboard

#### Get Dashboard Stats
```http
GET /dashboard
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "totalCertificates": 15,
    "verifiedCertificates": 12,
    "pendingCertificates": 2,
    "sharedCertificates": 5,
    "expiredCertificates": 1,
    "totalDownloads": 48,
    "totalViews": 156,
    "storageUsed": "245.8 MB",
    "certificatesByCategory": {
      "academic": 5,
      "professional": 4,
      ...
    }
  }
}
```

---

### Activity Logs

#### Get Activity Logs
```http
GET /activity-logs?action=certificate_uploaded&limit=50
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": [
    {
      "userId": "user_123",
      "action": "certificate_uploaded",
      "description": "Uploaded AWS Solutions Architect certificate",
      "certificateId": "CERT_001",
      "timestamp": "2024-06-20T14:30:00Z"
    }
  ]
}
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* Endpoint-specific data */ },
  "timestamp": "2024-06-20T14:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "timestamp": "2024-06-20T14:30:00Z"
}
```

---

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Category Values

```
academic
professional
internship
training
government
identity
license
achievement
workshop
other
```

## Verification Status Values

```
verified
pending
revoked
expired
```

## Share Permission Values

```
view
download
```

## Activity Actions

```
user_login
user_logout
certificate_uploaded
certificate_downloaded
certificate_shared
certificate_verified
certificate_deleted
certificate_revoked
```

---

## Error Examples

### Missing Authorization
```http
Response: 401
{
  "success": false,
  "message": "Unauthorized",
  "error": "Invalid or missing token"
}
```

### Validation Error
```http
Response: 400
{
  "success": false,
  "message": "Validation error",
  "error": {
    "missingFields": ["certificateName", "issuer"],
    "message": "Missing required fields: certificateName, issuer"
  }
}
```

### Invalid Category
```http
Response: 400
{
  "success": false,
  "message": "Invalid category",
  "error": "Category must be one of: academic, professional, ..."
}
```

---

## Rate Limiting

API endpoints are rate-limited to:
- 100 requests per minute for authenticated users
- 10 requests per minute for public endpoints

---

## Best Practices

1. **Always include Authorization header** for protected endpoints
2. **Use pagination** - Limit results with `limit` and `offset` parameters
3. **Validate input** - Check required fields before sending requests
4. **Handle errors gracefully** - Check `success` field in response
5. **Log activities** - Monitor activity logs for security
6. **Set expiry dates** - When sharing certificates, consider expiry dates
7. **Use HTTPS** - Always use HTTPS in production

---

## Testing

Use tools like Postman or curl to test endpoints:

```bash
# Get authorization token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# List certificates
curl -X GET http://localhost:3000/api/certificates \
  -H "Authorization: Bearer <token>"

# Create certificate
curl -X POST http://localhost:3000/api/certificates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "certificateName": "AWS Solutions Architect",
    "issuer": "Amazon Web Services",
    "category": "professional",
    "issueDate": "2024-01-15",
    "ownerName": "John Doe",
    "ownerEmail": "john@example.com"
  }'
```
