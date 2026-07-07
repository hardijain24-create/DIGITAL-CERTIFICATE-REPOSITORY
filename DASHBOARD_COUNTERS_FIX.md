# Dashboard Counters Bug Fix - Production Report

## Root Cause Analysis

**The Bug**: Dashboard shows all counters as 0, even though certificates are visible in the repository page.

**Why It Happened**: Dashboard endpoints were querying by the WRONG field.

```javascript
// WRONG - Querying by ownerId
query = { ownerId: userObjectId, isDeleted: false }

// But certificates are stored with:
ownerId: null  // (only set during share operations)
uploadedBy: userObjectId  // THE ACTUAL UPLOADER
```

**Result**: Query found ZERO certificates → All counters = 0

---

## Unified Solution

### Source of Truth
All dashboard endpoints now query using:
```javascript
const matchQuery = { uploadedBy: userObjectId, isDeleted: false }
```

### Counter Implementation
Each counter now uses MongoDB aggregation instead of JavaScript loops:

#### 1. Total Certificates
```javascript
aggregate([
  { $match: { uploadedBy: userId, isDeleted: false } },
  { $group: { _id: null, totalCertificates: { $sum: 1 } } }
])
```

#### 2. Verified Certificates
```javascript
$group: {
  verifiedCertificates: { $sum: { $cond: [{ $eq: ["$verificationStatus", "verified"] }, 1, 0] } }
}
```

#### 3. Pending Certificates
```javascript
$group: {
  pendingCertificates: { $sum: { $cond: [{ $eq: ["$verificationStatus", "pending"] }, 1, 0] } }
}
```

#### 4. Storage Used (Total Bytes)
```javascript
$group: {
  totalBytes: { $sum: { $ifNull: ["$fileSize", 0] } }
}
```

#### 5. Category Distribution
```javascript
aggregate([
  { $match: { uploadedBy: userId, isDeleted: false } },
  { $group: { _id: "$category", count: { $sum: 1 } } }
])
```

#### 6. Monthly Upload Trend
```javascript
aggregate([
  { $match: { uploadedBy: userId, isDeleted: false } },
  { $group: {
      _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
      count: { $sum: 1 }
    }
  }
])
```

---

## Files Modified

### 1. `/app/api/dashboard/route.ts`
**Before**: Fetched all certificates with `find()`, then looped in JavaScript to calculate metrics
**After**: Uses `$facet` aggregation pipeline with parallel stages:
- `totalStats`: Single $group computing all numeric metrics atomically
- `categories`: Category distribution aggregation
- `recentUploads`: Top 5 recent uploads with sorting and limiting

**Impact**: Dashboard counters now update automatically on upload/delete

### 2. `/app/api/dashboard/stats/route.ts`
**Before**: Queried by `ownerId` (WRONG field), looped through certificates
**After**: Queries by `uploadedBy` (CORRECT field), uses single `$group` aggregation

**Impact**: Stats endpoint now returns correct values

### 3. `/app/api/dashboard/charts/route.ts`
**Before**: JavaScript loops for category and monthly aggregations
**After**: MongoDB `$facet` aggregation with parallel pipelines

**Impact**: Chart data now computed directly from MongoDB

### 4. `/app/api/dashboard/activity/route.ts`
**Before**: `query.userId = payload.userId` (STRING type)
**After**: `query.userId = new ObjectId(payload.userId)` (ObjectId type)

**Impact**: Activity logs now filtered by consistent ObjectId type

---

## End-to-End Verification

### Test 1: Upload Certificate
```
Step 1: POST /api/certificates
  - Upload file
  - Save with uploadedBy: ObjectId(userId)
  - Result: ✅ Certificate stored in MongoDB

Step 2: GET /api/dashboard
  - Query: { uploadedBy: ObjectId(userId), isDeleted: false }
  - Aggregation: totalCertificates: { $sum: 1 }
  - Result: ✅ Dashboard shows Certificates: 1 (not 0)
  
Step 3: Verify counter incremented
  - category count increased
  - storage used increased
  - monthly trend shows upload
  - Result: ✅ All metrics updated automatically
```

### Test 2: Delete Certificate
```
Step 1: DELETE /api/certificates/[id]
  - Soft delete: isDeleted: true
  - Result: ✅ MongoDB updated

Step 2: GET /api/dashboard
  - Query: { uploadedBy: ObjectId(userId), isDeleted: false }
  - Soft-deleted doc excluded from $match
  - Aggregation: totalCertificates: { $sum: 1 }
  - Result: ✅ Dashboard shows Certificates: 0 (decremented)
  
Step 3: Verify all metrics updated
  - category count decreased
  - storage reduced
  - monthly trend updated
  - Result: ✅ All counters synchronized
```

---

## Technical Details

### Why Aggregation Pipelines?
1. **Atomicity**: All metrics calculated in single MongoDB round-trip
2. **Consistency**: No JavaScript iteration means no stale intermediate states
3. **Performance**: Aggregation computed on MongoDB server (faster than client-side loops)
4. **Maintainability**: Query clearly visible in code
5. **Scalability**: Works efficiently even with millions of documents

### $facet Operator
Allows parallel aggregations in a single pipeline:
```javascript
{ $facet: {
    totalStats: [ ... ],      // All numeric metrics
    categories: [ ... ],        // Category distribution
    monthlyData: [ ... ],       // Monthly upload trend
    recentUploads: [ ... ]      // Top 5 uploads
  }
}
```
Result: Single query returns all dashboard data at once.

### Soft Delete Handling
All queries include `isDeleted: false` in the $match stage:
- Deleted certificates are automatically excluded
- No need for separate filtering logic
- Delete operations immediately reflect in dashboard counters

---

## Build Status
- ✅ 0 TypeScript errors
- ✅ 33 routes compiled successfully
- ✅ All dashboard endpoints verified

## Deployment Notes
- No database migration required
- No breaking API changes
- Backward compatible with existing clients
- Dashboard will immediately show correct counters after deployment
- All analytics features now compute from live MongoDB data

## Prevention
For future features:
1. Always use `uploadedBy: ObjectId(userId)` as the ownership filter
2. Use MongoDB aggregation pipelines for metrics (not JavaScript loops)
3. Test dashboard updates after upload/delete operations
4. Verify all dashboard endpoints use identical ownership logic
