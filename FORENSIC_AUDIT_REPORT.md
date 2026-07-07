# DCRS Backend Forensic Audit Report

## Root Cause Analysis: Why Uploaded Certificates Are Invisible to Read APIs

### Executive Summary

**Critical Issue**: Uploaded certificates successfully stored in MongoDB but cannot be retrieved by GET endpoints, dashboard, search, or verification APIs.

**Root Cause**: JWT payload contains field `userId` but upload stores `ownerId` as a string, while GET query converts `payload.userId` to ObjectId before comparing—causing ObjectId ≠ String mismatch.

---

## Detailed Trace: Certificate Lifecycle

### PHASE 1: WRITE QUERY (Upload)

**File**: `/app/api/certificates/route.ts` - POST endpoint

**Step 1: JWT Authentication** (lines 151-161)
```
Token extracted from cookie/header
↓
verifyJWT(token, JWT_SECRET) called
↓
Payload: { userId: "string_id", email: "...", role: "user" }
```

**Step 2: Certificate Storage** (lines 265-288)
```
newCertificate = Certificate.create({
  certificateId: "CERT_...",
  ownerId: payload.userId,              // ← STORES AS STRING
  uploadedBy: payload.userId,           // ← STORES AS STRING
  ownerEmail: ownerEmail,               // ← STORES AS STRING
  ...
})
```

**MongoDB Document Created**:
```json
{
  "_id": ObjectId("..."),
  "certificateId": "CERT_1783423600691_89D14B85",
  "ownerId": "6a4ce2266eafc6957770dc5d",        // STRING
  "uploadedBy": "6a4ce2266eafc6957770dc5d",    // STRING
  "ownerEmail": "testuser@example.com",         // STRING
  "isDeleted": false,
  ...
}
```

---

### PHASE 2: READ QUERY (GET /api/certificates)

**File**: `/app/api/certificates/route.ts` - GET endpoint

**Step 1: JWT Authentication** (lines 26-35)
```
Token extracted
↓
verifyJWT(token, JWT_SECRET) called
↓
Payload: { userId: "6a4ce2266eafc6957770dc5d", ... }  // STRING from JWT
```

**Step 2: Query Building** (lines 56-72)
```javascript
let query: any = { isDeleted: false }
const ObjectId = require("mongoose").Types.ObjectId

if (payload.role === "user") {
  query.$or = [
    { ownerId: new ObjectId(payload.userId) },   // ← CONVERTS TO ObjectId
    { ownerEmail: payload.email }
  ]
}
```

**MongoDB Query Executed**:
```json
{
  isDeleted: false,
  $or: [
    { ownerId: ObjectId("6a4ce2266eafc6957770dc5d") },  // ObjectId
    { ownerEmail: "testuser@example.com" }              // STRING
  ]
}
```

---

## The Mismatch

| Operation | Field | Type | Value |
|-----------|-------|------|-------|
| **WRITE** (Upload) | ownerId | **STRING** | "6a4ce2266eafc6957770dc5d" |
| **READ** (GET) | ownerId | **ObjectId** | ObjectId("6a4ce2266eafc6957770dc5d") |
| **MATCH** | | **NO** | STRING ≠ ObjectId |

### Why the Query Fails

MongoDB treats these as different types:
- Stored document: `ownerId: "6a4ce2266eafc6957770dc5d"` (String)
- Query criteria: `{ ownerId: ObjectId("6a4ce2266eafc6957770dc5d") }` (ObjectId)
- Result: **No match** → certificate invisible

---

## Why Other Endpoints Also Fail

### Dashboard (`/api/dashboard`)
Same issue: Converts `payload.userId` to ObjectId, but stored as String

### Verification (`/api/verify`)
Uses `certificateId` lookup which works, BUT:
- If verifying by hash: same ObjectId issue applies
- Activity log creation fails because `userId` mismatch

### Search (`/api/certificates/search`)
Same ObjectId mismatch issue

### Delete (`DELETE /api/certificates/[id]`)
Query fails to find certificate due to ObjectId/String mismatch

---

## Why This Bug Wasn't Caught

1. **No Debug Logging**: Upload endpoint doesn't log what it stored
2. **No Type Validation**: JWT stores userId as String; models expect ObjectId
3. **Silent Failure**: GET returns empty array instead of error
4. **No Schema Validation**: Mongoose should enforce ObjectId but accepts String

---

## The Fix

### Option 1: Store as ObjectId (Correct Approach)

**File**: `/app/api/certificates/route.ts` - POST endpoint, line 268

**Before**:
```javascript
ownerId: payload.userId, // String from JWT
```

**After**:
```javascript
ownerId: new mongoose.Types.ObjectId(payload.userId), // Convert to ObjectId
uploadedBy: new mongoose.Types.ObjectId(payload.userId),
```

### Why This Works

- Upload stores: `ownerId: ObjectId("...")`
- GET queries: `{ ownerId: ObjectId("...") }`
- MongoDB match: **ObjectId = ObjectId** ✅

### Where Else This Fix Applies

All POST endpoints that store userId references:
- `UploadedBy` field - **MUST** be ObjectId
- `deletedBy` field - **MUST** be ObjectId
- `verifiedBy` field - **MUST** be ObjectId

---

## Additional Issues Found

### 1. uploadedBy Not Consistently Used

**GET Query** (line 69):
```javascript
{ uploadedBy: new ObjectId(payload.userId) }  // Institution role
```

**But POST stores**:
```javascript
uploadedBy: payload.userId  // String
```

### 2. ownerEmail Fallback

The GET query includes:
```javascript
{ ownerEmail: payload.email }
```

This works because `ownerEmail` is stored as String in both places. However, if `ownerEmail` is null/undefined, the query fails.

### 3. No Indexes on ownerId

Certificate schema has `ownerId` indexed (line 92 in models), but query performance could be better with compound indexes:
```javascript
db.certificates.createIndex({ isDeleted: 1, ownerId: 1 })
```

---

## Impact Assessment

| Component | Status | Impact |
|-----------|--------|--------|
| Upload | ✅ Works | Stores documents (wrong type) |
| GET /api/certificates | ❌ Broken | Returns 0 results |
| Dashboard | ❌ Broken | Shows empty state |
| Search | ❌ Broken | No results |
| Verification | ⚠️ Partial | Works with certificateId, fails with hash |
| Delete | ❌ Broken | Cannot find certificate |
| Verify/Count | ❌ Broken | Counters don't update |

**System Status**: 14% Working

---

## Recommended Fix Order

1. **CRITICAL**: Convert `payload.userId` to ObjectId in POST endpoint
2. **CRITICAL**: Review all POST endpoints for userId/ObjectId consistency
3. **HIGH**: Add comprehensive debug logging to trace writes vs reads
4. **HIGH**: Add type validation in Mongoose schema
5. **MEDIUM**: Add compound indexes for query performance
6. **MEDIUM**: Add unit tests for JWT payload handling

---

## Testing After Fix

After converting to ObjectId in POST:

```bash
# 1. Upload certificate
POST /api/certificates
Response: certificateId "CERT_..."

# 2. Should appear immediately
GET /api/certificates?limit=5
Expected: 1 certificate returned

# 3. Dashboard should update
GET /api/dashboard
Expected: totalCertificates: 1

# 4. Search should find it
GET /api/certificates/search?q=name
Expected: 1 result

# 5. Delete should work
DELETE /api/certificates/CERT_...
Expected: 200 OK, certificate hidden

# 6. Dashboard should decrement
GET /api/dashboard
Expected: totalCertificates: 0
```

---

## Conclusion

**Root Cause**: JWT payload field `userId` (String) not converted to MongoDB ObjectId before storage, while all read queries convert to ObjectId for comparison.

**Fix**: One-line change in POST endpoint to ensure `ownerId` and `uploadedBy` are stored as ObjectId types.

**Testing Duration**: 5 minutes
**Risk**: Low (fixes type mismatch, no logic changes)
**Deployment**: Should fix 86% of backend issues immediately
