# Migration Guide - Multiple Enrollments Support

## 📌 Pre-Migration Checklist

- [ ] **Backup database** (CRITICAL!)
- [ ] Review current data structure
- [ ] Test migration script in staging environment
- [ ] Notify users of maintenance window
- [ ] Prepare rollback plan

---

## 🗄️ Database Changes (MongoDB)

### 1. Plan Collection Updates

**Changes:**
- Add `monthlyAmount` array field
- Add `averageMonthlyAmount` number field

**MongoDB Query:**
```javascript
// This is handled automatically by the Plan model's pre-save hook
// No manual migration needed - just save existing plans

db.plans.find().forEach(function(plan) {
  // When you re-save, the pre-save hook will:
  // 1. Build monthlyAmount array from monthlyData
  // 2. Calculate averageMonthlyAmount
  db.plans.save(plan);
});
```

**Equivalent SQL (for reference):**
```sql
-- Add new columns
ALTER TABLE plans ADD COLUMN monthly_amount JSON;
ALTER TABLE plans ADD COLUMN average_monthly_amount DECIMAL(10,2);

-- Populate monthlyAmount from monthlyData
UPDATE plans
SET monthly_amount = (
  SELECT JSON_ARRAYAGG(payable_amount ORDER BY month_number)
  FROM monthly_data
  WHERE monthly_data.plan_id = plans.id
);

-- Calculate average
UPDATE plans
SET average_monthly_amount = (
  SELECT AVG(payable_amount)
  FROM monthly_data
  WHERE monthly_data.plan_id = plans.id
);
```

### 2. Invoice Collection Updates

**Changes:**
- Ensure all invoices have `enrollmentId`
- Recalculate `dueAmount` from plan.monthlyAmount[dueNumber-1]
- Recalculate `balanceAmount`

**MongoDB Migration (automated via script):**
```javascript
// Run: npx tsx scripts/migrate-invoices-enrollment.ts

// Manual equivalent:
db.invoices.find({ enrollmentId: { $exists: false } }).forEach(function(invoice) {
  // Find matching enrollment
  var enrollment = db.enrollments.findOne({
    userId: invoice.customerId,
    planId: invoice.planId
  });

  if (enrollment) {
    // Get plan
    var plan = db.plans.findOne({ _id: invoice.planId });

    // Calculate dueAmount
    var dueNumber = parseInt(invoice.dueNumber) || 1;
    var index = dueNumber - 1;
    var newDueAmount = plan.monthlyAmount[index] || invoice.dueAmount || 0;

    // Calculate balanceAmount
    var receivedAmount = invoice.receivedAmount || 0;
    var newBalanceAmount = newDueAmount - receivedAmount;

    // Update invoice
    db.invoices.update(
      { _id: invoice._id },
      {
        $set: {
          enrollmentId: enrollment._id,
          dueAmount: newDueAmount,
          balanceAmount: newBalanceAmount
        }
      }
    );
  }
});
```

**Equivalent SQL (for reference):**
```sql
-- Update invoices with enrollmentId
UPDATE invoices i
SET enrollment_id = (
  SELECT e.id
  FROM enrollments e
  WHERE e.user_id = i.customer_id
    AND e.plan_id = i.plan_id
  LIMIT 1
)
WHERE i.enrollment_id IS NULL;

-- Recalculate dueAmount from monthlyAmount array
UPDATE invoices i
JOIN plans p ON i.plan_id = p.id
SET i.due_amount = JSON_EXTRACT(p.monthly_amount, CONCAT('$[', i.due_number - 1, ']'))
WHERE JSON_LENGTH(p.monthly_amount) > 0;

-- Recalculate balanceAmount
UPDATE invoices
SET balance_amount = due_amount - received_amount;
```

### 3. No Changes Needed for:
- ✅ Users collection
- ✅ Enrollments collection (already supports multiple per user)
- ✅ Payments collection

---

## 🚀 Step-by-Step Migration Process

### Phase 1: Preparation (Before Deployment)

```bash
# 1. Backup database
mongodump --uri="your_mongodb_uri" --out=backup_$(date +%Y%m%d_%H%M%S)

# 2. Verify backup
ls -lh backup_*/

# 3. Test in staging environment first
export MONGODB_URI="staging_mongodb_uri"
npm run dev
```

### Phase 2: Code Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build application
npm run build

# 4. Stop application (if using PM2)
pm2 stop invoify

# 5. Start application
pm2 start invoify
# OR
npm run start
```

### Phase 3: Run Migration Script

```bash
# Run the migration script
npx tsx scripts/migrate-invoices-enrollment.ts

# Expected output:
# 🚀 Starting invoice migration...
#
# 📊 Found 245 invoices to process
#
# ... processing logs ...
#
# ====================================
# 📊 MIGRATION SUMMARY
# ====================================
# Total Invoices:       245
# ✅ Updated:           220
# ⏭️  Skipped:           15
# ⚠️  No Enrollment:     8
# ❌ Errors:            2
# ====================================
```

### Phase 4: Verification

```bash
# 1. Check invoice counts
echo "db.invoices.countDocuments({ enrollmentId: { \$exists: true } })" | mongosh your_mongodb_uri

# 2. Verify no null enrollmentIds for new invoices
echo "db.invoices.find({ enrollmentId: null }).count()" | mongosh your_mongodb_uri

# 3. Check plan monthlyAmount arrays
echo "db.plans.find({}, { planName: 1, monthlyAmount: 1 }).pretty()" | mongosh your_mongodb_uri

# 4. Test invoice creation via UI
# - Create a user
# - Enroll in 2 plans
# - Create invoices for each enrollment
# - Verify dueAmount is correct
```

### Phase 5: Monitoring

```bash
# 1. Check application logs
pm2 logs invoify --lines 100

# 2. Monitor for errors
tail -f logs/error.log

# 3. Check database queries
# Look for slow queries or errors in MongoDB logs
```

---

## 🔄 Rollback Plan

### If Migration Fails:

#### Option 1: Restore from Backup (Safest)

```bash
# 1. Stop application
pm2 stop invoify

# 2. Drop current database
mongosh your_mongodb_uri --eval "db.dropDatabase()"

# 3. Restore from backup
mongorestore --uri="your_mongodb_uri" backup_YYYYMMDD_HHMMSS/

# 4. Restart application
pm2 start invoify
```

#### Option 2: Revert Code Changes Only

```bash
# 1. Revert to previous commit
git revert HEAD

# 2. Rebuild
npm run build

# 3. Restart
pm2 restart invoify
```

**Note:** Option 2 only works if no data was corrupted. Database changes are backward compatible, so old code should still work.

---

## 📊 Post-Migration Validation Queries

### 1. Check all plans have monthlyAmount

```javascript
// MongoDB
db.plans.find({ monthlyAmount: { $exists: false } }).count()
// Expected: 0

db.plans.find({ monthlyAmount: { $size: 0 } }).count()
// Expected: Should match plans without monthlyData
```

### 2. Check all invoices have enrollmentId

```javascript
// MongoDB - New invoices should all have enrollmentId
db.invoices.find({
  createdAt: { $gte: new Date('2025-01-20') },
  enrollmentId: { $exists: false }
}).count()
// Expected: 0
```

### 3. Verify dueAmount calculations

```javascript
// MongoDB - Check a sample invoice
db.invoices.aggregate([
  { $lookup: {
      from: 'plans',
      localField: 'planId',
      foreignField: '_id',
      as: 'plan'
  }},
  { $unwind: '$plan' },
  { $project: {
      invoiceId: 1,
      dueNumber: 1,
      dueAmount: 1,
      expectedDueAmount: {
        $arrayElemAt: ['$plan.monthlyAmount', { $subtract: ['$dueNumber', 1] }]
      }
  }},
  { $match: {
      $expr: { $ne: ['$dueAmount', '$expectedDueAmount'] }
  }}
]).pretty()
// Expected: Empty (all should match)
```

### 4. Check balanceAmount calculations

```javascript
// MongoDB
db.invoices.find({
  $expr: {
    $ne: ['$balanceAmount', { $subtract: ['$dueAmount', '$receivedAmount'] }]
  }
}).count()
// Expected: 0 (all balanceAmounts should be correct)
```

### 5. Verify enrollment-invoice relationships

```javascript
// MongoDB
db.invoices.aggregate([
  { $lookup: {
      from: 'enrollments',
      localField: 'enrollmentId',
      foreignField: '_id',
      as: 'enrollment'
  }},
  { $match: { enrollment: { $size: 0 } }},
  { $count: 'orphanedInvoices' }
])
// Expected: { orphanedInvoices: 0 }
```

---

## 🐛 Common Issues and Solutions

### Issue 1: "No enrollment found" during migration

**Symptoms:**
```
⚠️  No enrollment found for customerId: CF000001, planId: 674...
```

**Cause:** Invoice exists for user+plan but no enrollment record

**Solution:**
```javascript
// Create missing enrollment
const invoice = db.invoices.findOne({ invoiceId: 'INV-XXXX' });
const enrollment = new Enrollment({
  userId: invoice.customerId,
  planId: invoice.planId,
  status: 'active',
  enrollmentDate: invoice.createdAt,
  startDate: invoice.createdAt,
  endDate: new Date(invoice.createdAt).setMonth(
    new Date(invoice.createdAt).getMonth() + 12
  )
});
await enrollment.save();

// Re-run migration
```

### Issue 2: dueAmount is 0 after migration

**Cause:** Plan.monthlyAmount array is empty

**Solution:**
```javascript
// Trigger pre-save hook to build monthlyAmount
const plans = await Plan.find({});
for (const plan of plans) {
  await plan.save(); // This triggers the pre-save hook
}

// Re-run migration
npx tsx scripts/migrate-invoices-enrollment.ts
```

### Issue 3: TypeError: Cannot read property 'length' of undefined

**Cause:** Some plans don't have monthlyAmount or monthlyData

**Solution:**
```javascript
// Add default monthlyAmount for plans
db.plans.find({
  monthlyAmount: { $exists: false },
  monthlyData: { $exists: false }
}).forEach(function(plan) {
  const avgAmount = plan.totalAmount / plan.duration;
  const monthlyArray = Array(plan.duration).fill(avgAmount);

  db.plans.update(
    { _id: plan._id },
    { $set: { monthlyAmount: monthlyArray } }
  );
});
```

---

## 📈 Performance Considerations

### Indexing

```javascript
// Add indexes for better query performance
db.invoices.createIndex({ enrollmentId: 1 });
db.invoices.createIndex({ customerId: 1, planId: 1 });
db.enrollments.createIndex({ userId: 1 });
db.enrollments.createIndex({ planId: 1 });
```

### Large Dataset Handling

If you have > 10,000 invoices:

```javascript
// Process in batches
const batchSize = 1000;
const totalInvoices = db.invoices.countDocuments({ enrollmentId: { $exists: false } });

for (let skip = 0; skip < totalInvoices; skip += batchSize) {
  const batch = db.invoices.find({ enrollmentId: { $exists: false } })
    .skip(skip)
    .limit(batchSize);

  // Process batch...
  print(`Processed ${skip + batchSize} / ${totalInvoices}`);
}
```

---

## ✅ Final Checklist

- [ ] Database backed up
- [ ] Code deployed
- [ ] Migration script executed successfully
- [ ] All invoices have enrollmentId
- [ ] All plans have monthlyAmount arrays
- [ ] dueAmount calculations verified
- [ ] balanceAmount calculations verified
- [ ] Dashboard shows correct totals
- [ ] Test invoice creation works
- [ ] Test multiple enrollments per user
- [ ] No errors in application logs
- [ ] Performance is acceptable
- [ ] Users notified of completion

---

## 📞 Emergency Contacts

- **Database Issues:** DBA Team
- **Application Errors:** Dev Team
- **Business Logic:** Product Manager
- **Rollback Required:** System Administrator

---

**Migration Checklist:**
```
[ ] Pre-migration backup complete
[ ] Staging environment tested
[ ] Production deployment scheduled
[ ] Migration script tested
[ ] Rollback plan prepared
[ ] Team notified
[ ] Migration executed
[ ] Verification completed
[ ] Monitoring active
[ ] Documentation updated
```

---

**Document Version:** 1.0
**Last Updated:** 2025-01-21
**Status:** Ready for Production
