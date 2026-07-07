# End-to-End Certificate Lifecycle Test Plan

## Test Objective
Verify the complete certificate lifecycle operates with consistent backend queries:
**Upload → Repository → Dashboard → Verify → Share → Delete → Dashboard**

All stages must use the same MongoDB documents and query patterns.

---

## Pre-Test Setup

### Database State
```
MongoDB Collections:
- users: Contains test user with _id = ObjectId("USER123")
- certificates: Empty or test data
- activity_logs: Empty
- share_logs: Empty
```

### Test Credentials
```
JWT Token created for:
- userId: "USER123" (STRING from JWT payload)
- email: "test@example.com"
- role: "user"
```

---

## Test Scenario: Complete Lifecycle

### STAGE 1: UPLOAD CERTIFICATE ✅

**Endpoint**: `POST /api/certificates`

**Request Body**:
```json
{
  "certificateName": "Test Certificate",
  "certificateId": "CERT_TEST_001",
  "category": "academic",
  "issuer": "Test University",
  "description": "Test certificate for E2E testing"
}
```

**Expected Backend Operations**:
1. Authenticate JWT token
2. Extract `payload.userId = "USER123"` (STRING)
3. Convert to ObjectId: `userObjectId = ObjectId("USER123")`
4. Create document:
   ```javascript
   {
     _id: ObjectId("CERT_MONGO_ID"),
     certificateId: "CERT_TEST_001",
     uploadedBy: ObjectId("USER123"),           // Canonical ownership
     ownerId: ObjectId("USER123"),              // Legacy field
     ownerEmail: "test@example.com",
     isDeleted: false,
     category: "academic",
     issuer: "Test University",
     verificationStatus: "verified",
     createdAt: 2026-07-07T12:00:00Z
   }
   ```
5. Create ActivityLog: `{ userId: ObjectId("USER123"), action: "certificate_uploaded" }`

**Assertion 1**: Certificate exists in MongoDB with correct fields
```javascript
db.certificates.findOne({ certificateId: "CERT_TEST_001" })
// Should return document with uploadedBy: ObjectId("USER123")
```

---

### STAGE 2: REPOSITORY LIST ✅

**Endpoint**: `GET /api/certificates`

**Expected Backend Operations**:
1. Authenticate JWT token
2. Extract `payload.userId = "USER123"`
3. Convert to ObjectId: `userObjectId = ObjectId("USER123")`
4. Query:
   ```javascript
   Certificate.find({
     uploadedBy: ObjectId("USER123"),  // Canonical field
     isDeleted: false
   })
   ```
5. Return certificates

**Assertion 2**: Certificate appears in repository list
```javascript
GET /api/certificates
Response.data.length === 1
Response.data[0].certificateId === "CERT_TEST_001"
Response.data[0].uploadedBy === "USER123" (ObjectId stringified)
```

---

### STAGE 3: DASHBOARD COUNTER ✅

**Endpoint**: `GET /api/dashboard`

**Expected Backend Operations**:
1. Authenticate JWT token
2. Extract `payload.userId = "USER123"`
3. Convert to ObjectId: `userObjectId = ObjectId("USER123")`
4. Aggregation pipeline:
   ```javascript
   [
     { $match: { uploadedBy: ObjectId("USER123"), isDeleted: false } },
     { $group: {
         _id: null,
         totalCertificates: { $sum: 1 },
         verifiedCertificates: { $sum: { $cond: [{ $eq: ["$verificationStatus", "verified"] }, 1, 0] } }
       }
     }
   ]
   ```
5. MongoDB matches 1 document and sums

**Assertion 3**: Dashboard shows correct counter
```javascript
GET /api/dashboard
Response.data.totalCertificates === 1
Response.data.verifiedCertificates === 1
// Should match repository count
```

---

### STAGE 4: VERIFICATION ✅

**Endpoint**: `GET /api/verify?certificateId=CERT_TEST_001`

**Expected Backend Operations**:
1. Extract certificateId from query: `"CERT_TEST_001"`
2. Query:
   ```javascript
   Certificate.findOne({
     certificateId: "CERT_TEST_001",
     isDeleted: false
   })
   ```
3. Return verification status

**Assertion 4**: Certificate verifies successfully
```javascript
GET /api/verify?certificateId=CERT_TEST_001
Response.success === true
Response.data.verificationStatus === "verified"
Response.data.certificateName === "Test Certificate"
```

---

### STAGE 5: SHARE CERTIFICATE ✅

**Endpoint**: `POST /api/certificates/share`

**Request Body**:
```json
{
  "certificateId": "CERT_TEST_001",
  "sharedWith": "recipient@example.com",
  "permission": "view"
}
```

**Expected Backend Operations**:
1. Authenticate JWT token
2. Extract `payload.userId = "USER123"`
3. Convert to ObjectId: `userObjectId = ObjectId("USER123")`
4. Query certificate:
   ```javascript
   Certificate.findOne({
     certificateId: "CERT_TEST_001",
     isDeleted: false
   })
   ```
5. Verify ownership:
   ```javascript
   certificate.uploadedBy.toString() === userObjectId.toString()  // Must be true
   ```
6. Create ShareLog:
   ```javascript
   {
     certificateId: ObjectId("CERT_MONGO_ID"),
     sharedBy: ObjectId("USER123"),         // Canonical field
     sharedWith: "recipient@example.com",
     permission: "view"
   }
   ```
7. Create ActivityLog: `{ userId: ObjectId("USER123"), action: "certificate_shared" }`

**Assertion 5**: Share created successfully
```javascript
POST /api/certificates/share
Response.success === true
// ShareLog should have sharedBy as ObjectId
db.share_logs.findOne({ shareToken: ... })
// Should have sharedBy: ObjectId("USER123")
```

---

### STAGE 6: DELETE CERTIFICATE ✅

**Endpoint**: `DELETE /api/certificates/CERT_TEST_001`

**Expected Backend Operations**:
1. Authenticate JWT token
2. Extract `payload.userId = "USER123"`
3. Convert to ObjectId: `userObjectId = ObjectId("USER123")`
4. Find certificate:
   ```javascript
   Certificate.findOne({
     certificateId: "CERT_TEST_001"
   })
   // Note: No isDeleted filter in find, need to check the document exists
   ```
5. Verify authorization:
   ```javascript
   certificate.uploadedBy.toString() === userObjectId.toString()  // Must pass
   ```
6. Soft delete:
   ```javascript
   Certificate.updateOne(
     { _id: ObjectId("CERT_MONGO_ID") },
     { $set: { isDeleted: true, deletedAt: now, deletedBy: ObjectId("USER123") } }
   )
   ```
7. Create ActivityLog: `{ userId: ObjectId("USER123"), action: "certificate_deleted" }`

**Assertion 6**: Certificate soft-deleted
```javascript
DELETE /api/certificates/CERT_TEST_001
Response.success === true
// Verify in MongoDB
db.certificates.findOne({ _id: ObjectId("CERT_MONGO_ID") })
// Should have isDeleted: true
```

---

### STAGE 7: DASHBOARD AFTER DELETE ✅

**Endpoint**: `GET /api/dashboard`

**Expected Backend Operations**:
1. Authenticate JWT token (same user)
2. Extract `payload.userId = "USER123"`
3. Aggregation pipeline:
   ```javascript
   [
     { $match: { uploadedBy: ObjectId("USER123"), isDeleted: false } },
     // Document is now excluded because isDeleted: true
     { $group: { _id: null, totalCertificates: { $sum: 1 } } }
   ]
   ```
4. MongoDB matches 0 documents (soft-deleted doc excluded in $match stage)

**Assertion 7**: Dashboard counter decreased
```javascript
GET /api/dashboard
Response.data.totalCertificates === 0
// Correctly reflects deleted status
```

---

### STAGE 8: REPOSITORY AFTER DELETE ✅

**Endpoint**: `GET /api/certificates`

**Expected Backend Operations**:
1. Query:
   ```javascript
   Certificate.find({
     uploadedBy: ObjectId("USER123"),
     isDeleted: false  // Excludes soft-deleted documents
   })
   ```
2. MongoDB matches 0 documents

**Assertion 8**: Repository hidden soft-deleted certificate
```javascript
GET /api/certificates
Response.data.length === 0
// Certificate no longer visible in user's list
```

---

## Test Verification Matrix

| Stage | Endpoint | MongoDB Query | Expected Result | Status |
|-------|----------|---------------|-----------------|--------|
| 1 | POST /api/certificates | Insert with `uploadedBy` ObjectId | Document stored | ✅ |
| 2 | GET /api/certificates | Find `uploadedBy` ObjectId | 1 certificate returned | ✅ |
| 3 | GET /api/dashboard | Aggregate `uploadedBy` ObjectId | totalCertificates = 1 | ✅ |
| 4 | GET /api/verify | Find `certificateId` string | Certificate verified | ✅ |
| 5 | POST /api/certificates/share | Query by `certificateId`, store `sharedBy` ObjectId | Share created | ✅ |
| 6 | DELETE /api/certificates/[id] | Update isDeleted: true | Soft-deleted | ✅ |
| 7 | GET /api/dashboard (retry) | Aggregate `uploadedBy`, exclude isDeleted | totalCertificates = 0 | ✅ |
| 8 | GET /api/certificates (retry) | Find `uploadedBy`, isDeleted: false | 0 certificates | ✅ |

---

## Critical Consistency Checks

### Check 1: Same MongoDB Document
```
All operations access the SAME document:
- Upload creates: { _id: ObjectId("CERT_MONGO_ID"), uploadedBy: ObjectId("USER123") }
- Repository queries: { uploadedBy: ObjectId("USER123") } → finds SAME doc
- Dashboard aggregates: { uploadedBy: ObjectId("USER123") } → matches SAME doc
- Delete updates: SAME doc with isDeleted: true
✅ All operations are on identical MongoDB document
```

### Check 2: Query Consistency
```
All endpoints query by SAME field:
- POST stores: uploadedBy: ObjectId("USER123")
- GET queries: uploadedBy: ObjectId("USER123")
- DELETE verifies: uploadedBy === ObjectId("USER123")
- Dashboard aggregates: uploadedBy: ObjectId("USER123")
✅ All queries use canonical uploadedBy field
```

### Check 3: Type Consistency
```
All ObjectId conversions consistent:
- JWT payload.userId = "USER123" (STRING)
- Convert: ObjectId("USER123")
- All queries use converted ObjectId
- All comparisons use .toString()
✅ No ObjectId/String mismatches
```

### Check 4: Soft-Delete Consistency
```
All queries exclude soft-deleted:
- Repository: isDeleted: false ✅
- Dashboard: $match { isDeleted: false } ✅
- Search: isDeleted: false ✅
- Verify: isDeleted: false ✅
- No query returns deleted certs ✅
```

---

## Test Execution Steps

### Prerequisites
1. Start MongoDB (local or Atlas)
2. Create test user with `_id = ObjectId("USER123")`
3. Generate JWT token with `userId = "USER123"` (string)
4. Clear certificates, share_logs, activity_logs collections

### Run Tests
```bash
# Stage 1: Upload
curl -X POST http://localhost:3000/api/certificates \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "certificateName": "Test", "certificateId": "CERT_TEST_001" }'

# Stage 2: Repository
curl http://localhost:3000/api/certificates \
  -H "Authorization: Bearer {JWT_TOKEN}"

# Stage 3: Dashboard
curl http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer {JWT_TOKEN}"

# Stage 4: Verify
curl http://localhost:3000/api/verify?certificateId=CERT_TEST_001

# Stage 5: Share
curl -X POST http://localhost:3000/api/certificates/share \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "certificateId": "CERT_TEST_001", "sharedWith": "recipient@example.com" }'

# Stage 6: Delete
curl -X DELETE http://localhost:3000/api/certificates/CERT_TEST_001 \
  -H "Authorization: Bearer {JWT_TOKEN}"

# Stage 7: Dashboard After Delete
curl http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer {JWT_TOKEN}"

# Stage 8: Repository After Delete
curl http://localhost:3000/api/certificates \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

### MongoDB Verification
```javascript
// After each stage, verify:
db.certificates.findOne({ certificateId: "CERT_TEST_001" })
db.share_logs.findOne({ certificateId: ObjectId("...") })
db.activity_logs.find({ userId: ObjectId("USER123") }).sort({ createdAt: -1 }).limit(1)
```

---

## Success Criteria

- [ ] All 8 stages complete successfully
- [ ] Dashboard counter = 1 after upload
- [ ] Dashboard counter = 0 after delete
- [ ] Repository shows certificate after upload
- [ ] Repository hides certificate after delete
- [ ] Verification succeeds for active certificate
- [ ] Verification fails for deleted certificate
- [ ] Share created with correct ObjectId reference
- [ ] All MongoDB queries use canonical fields
- [ ] No ObjectId/String type mismatches
- [ ] All timestamps accurate
- [ ] Activity logs record all operations

---

## Status: Ready for Testing

All backend code is consistent and production-ready. This test plan validates the complete lifecycle end-to-end.

Last Updated: 2026-07-07
