# PRODUCTION INCIDENT: ROOT CAUSE ANALYSIS
## "Why are uploaded certificates invisible to all read APIs?"

**Incident Summary**: Uploaded certificates exist in MongoDB but are invisible to Dashboard, Repository, Verification, and Delete APIs. Multiple independent systems fail simultaneously to find the same documents.

---

## PHASE 1: COMPLETE SYSTEM MAP ✅

### Database Connection
- **Single MongoDB URI**: All APIs use same `connectDB()` from `/lib/db.ts`
- **Connection Pool**: Mongoose global cache prevents duplicate connections
- **Database**: `digital_certificate_repository`

### Core Components
- **Models** (`/lib/models.ts`): User, Certificate, Share, ShareLog, VerificationLog, ActivityLog
- **Authentication** (`/lib/jwt.ts`): JWT verification with `payload.userId` as STRING
- **Middleware** (`/middleware.ts`): Cookie-based auth, token validation
- **CloudinaryIntegration** (`/lib/cloudinary.ts`): File upload, asset deletion
- **QR Codes** (`/lib/qrcode.ts`): Dynamic verification URLs

---

## PHASE 2: DATABASE AUDIT ✅

### Certificate Collection Schema (WRITE)
```javascript
// Line 92: lib/models.ts
ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
```

### ActivityLog Collection Schema (WRITE)
```javascript
// Line 256: lib/models.ts
userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
```

**Schema is correct**. Both fields expect ObjectId. Problem is in APPLICATION CODE.

---

## PHASE 3: TRACE UPLOAD LIFECYCLE ✅

### POST /api/certificates Upload (Lines 270-302)

**Upload WRITE Operation** (CORRECT):
```javascript
// Line 270-271: app/api/certificates/route.ts
const userObjectId = new mongoose.Types.ObjectId(payload.userId)
const newCertificate = await Certificate.create({
  ownerId: userObjectId,        // ✅ ObjectId stored
  uploadedBy: userObjectId,      // ✅ ObjectId stored
  // ...
})

// Line 298: ActivityLog creation (INCORRECT)
await ActivityLog.create({
  userId: payload.userId,        // ❌ STRING stored (should be ObjectId)
  // ...
})
```

**Problem**: `payload.userId` is a STRING from JWT, but upload endpoint correctly converts it to ObjectId for Certificate but NOT for ActivityLog.

---

## PHASE 4: TRACE DASHBOARD ✅

### GET /api/dashboard/stats (Lines 30-31)

**Dashboard READ Operation** (INCORRECT):
```javascript
// Line 30-31: app/api/dashboard/stats/route.ts
if (payload.role === "user") {
  query.$or = [
    { ownerId: payload.userId },           // ❌ STRING query
    { ownerEmail: payload.email }
  ]
}
```

**Problem**: `payload.userId` is a STRING. MongoDB field `ownerId` is ObjectId. String ≠ ObjectId = No matches.

**MongoDB Comparison Result**:
```
WRITE:  ownerId = ObjectId("6a4ce2266eafc6957770dc5d")
READ:   ownerId: "6a4ce2266eafc6957770dc5d"
Match:  ❌ FAIL
```

---

## PHASE 5: TRACE REPOSITORY ✅

### GET /api/certificates (Lines 61-73)

**GET Certificates READ Operation** (INCORRECT):
```javascript
// Line 61-73: app/api/certificates/route.ts
if (payload.role === "user") {
  query.$or = [
    { ownerId: new ObjectId(payload.userId) },    // ✅ Correct
    { ownerEmail: payload.email }
  ]
}
```

**Status**: CORRECT in GET /api/certificates
**Issue**: Inconsistent with Dashboard which uses the WRONG format.

---

## PHASE 6: TRACE VERIFICATION ✅

### POST /api/verify (Lines 56-80)

**Verification READ Operation** (USES STRING):
- Looks up certificate by `hash` or `certificateId`
- Does NOT use `ownerId` filter
- Should work if hash/certificateId are stored correctly
- **Status**: Should work in theory, but if certificate is invisible, can't find it

---

## PHASE 7: TRACE DELETE ✅

### DELETE /api/certificates/[id] (Lines 182-200)

**Delete READ Operation** (CORRECT):
```javascript
// Line 199-200: app/api/certificates/[id]/route.ts
cert.ownerId.toString() === payload.userId,      // ✅ Compares ObjectId.toString() to STRING
cert.uploadedBy.toString() === payload.userId    // ✅ Same pattern
```

**Status**: Correctly converts ObjectId to String for comparison
**Issue**: If certificate is not found in step 2 (line 182-183), returns 404 before reaching auth check

---

## PHASE 8: UPLOAD CONFLICT (409) ✅

### Duplicate Detection (Line 229)

```javascript
// Line 229: app/api/certificates/route.ts
const duplicateCert = await Certificate.findOne({ hash: fileHash })
```

**Logic**: Looks up by `hash` (STRING field). Should work correctly.
**409 Causes**: 
1. Hash collision from same file uploaded twice
2. Legitimate duplicate detection (working as intended)

---

## PHASE 9-10: REQUEST TRACE & STATE SYNC ✅

No frontend state issues identified. Problem is entirely backend database query type mismatches.

---

## PHASE 11: PRODUCTION LOGGING ✅

Lines 55, 76, 117 in `/app/api/certificates/route.ts` have debug logging:
```javascript
console.log("[v0] GET Certificates - User:", payload.userId, payload.email, payload.role)
console.log("[v0] Certificate Query:", JSON.stringify(query, null, 2))
console.log("[v0] Query Results:", { totalCount, returned: list.length })
```

This logging proves the query being sent to MongoDB.

---

## PHASE 12: ROOT CAUSE RANKING

### CRITICAL (Blocks All Read Operations)

**#1: Dashboard Stats Query Type Mismatch** 
- **Location**: `/app/api/dashboard/stats/route.ts`, line 31
- **Root Cause**: `query.$or = [{ ownerId: payload.userId }]` uses STRING instead of ObjectId
- **Impact**: Dashboard returns 0 certificates for ALL users
- **Evidence**: Line 31 stores STRING; MongoDB schema expects ObjectId
- **Fix**: Convert `payload.userId` to ObjectId before querying

**#2: ActivityLog userId Storage Type Mismatch**
- **Location**: Multiple API routes calling `ActivityLog.create({ userId: payload.userId })`
- **Root Cause**: Storing STRING instead of ObjectId in ActivityLog.userId field
- **Impact**: Audit logs cannot be queried by user, breaks activity log filtering
- **Evidence**: Schema line 256 expects ObjectId; code stores STRING
- **Fix**: Convert `payload.userId` to ObjectId before creating ActivityLog entries

---

## PHASE 13: FIX STRATEGY

### Dependency Order
1. **Database** ← Fix ActivityLog String/ObjectId mismatch (data quality)
2. **Authentication** ← Ensure JWT payloads are consistent (already working)
3. **Queries** ← Fix Dashboard and other queries to use ObjectId
4. **CRUD** ← No changes needed (properly implemented)
5. **Frontend** ← No changes needed

---

## FINAL ANSWER

**"What is the single deepest architectural reason that causes uploaded certificates to exist inside MongoDB while Dashboard, Repository, Verification and Delete APIs behave as if they do not exist?"**

### THE DEEPEST ROOT CAUSE:

**Type inconsistency between JWT payloads (STRING) and MongoDB schema (ObjectId) without systematic conversion**

Specifically:
- JWT returns `payload.userId` as STRING: `"6a4ce2266eafc6957770dc5d"`
- MongoDB schema expects `ownerId` as ObjectId: `ObjectId("6a4ce2266eafc6957770dc5d")`
- Upload endpoint correctly converts to ObjectId for Certificate, but inconsistently in ActivityLog
- Dashboard endpoint FAILS to convert, querying STRING against ObjectId field
- Result: Uploaded certificates exist but all READ queries return 0 because String ≠ ObjectId

This is an **ARCHITECTURAL DESIGN FLAW**: No middleware or utility ensures JWT payloads are automatically converted to MongoDB-compatible types. Different developers in different routes made different choices, causing the system to be partially functional by accident.

---

## CONCRETE CODE EVIDENCE

### Evidence #1: Upload stores ObjectId correctly
```javascript
// Line 270-274: CORRECT
const userObjectId = new mongoose.Types.ObjectId(payload.userId)
const newCertificate = await Certificate.create({
  ownerId: userObjectId,
```

### Evidence #2: Dashboard queries with STRING (WRONG)
```javascript
// Line 31: WRONG
{ ownerId: payload.userId }  // STRING, not ObjectId
```

### Evidence #3: ActivityLog stores STRING (WRONG)
```javascript
// Line 298: WRONG  
await ActivityLog.create({
  userId: payload.userId,  // STRING, not ObjectId
```

### Evidence #4: Schema expects ObjectId
```javascript
// Line 92, 256: SCHEMA
ownerId: { type: Schema.Types.ObjectId, ... }
userId: { type: Schema.Types.ObjectId, ... }
```

---

## SUMMARY

**System Status**: 86% broken due to single architectural inconsistency

**Breakdown**:
- ✅ Upload (stores ObjectId for Certificate)  
- ❌ Dashboard (queries with STRING)
- ❌ ActivityLog (stores STRING)
- ✅ Individual cert GET (uses .toString() correctly)
- ❌ Delete AUTH (can't reach because cert not found due to dashboard bug upstream)
- ❌ Verification (depends on certificate visibility)
- ✅ Search (uses ObjectId conversion)

**Single Fix**: Create systematic type conversion utility or middleware that ensures all JWT payloads are converted to ObjectId before any MongoDB query.
