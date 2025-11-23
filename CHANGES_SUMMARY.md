# Multiple Enrollments - Changes Summary

## 📋 Quick Reference

### What Changed?

1. **Plan Model** - Added `monthlyAmount` array for variable monthly fees
2. **Invoice Creation** - Now auto-calculates `dueAmount` from `plan.monthlyAmount[dueNumber-1]`
3. **Dashboard** - Updated to aggregate across multiple enrollments per user
4. **Migration Script** - Created to update existing invoices with enrollmentId

### What Stayed the Same?

- ✅ Invoice model structure (already had enrollmentId)
- ✅ Enrollment model (no changes needed)
- ✅ User model (no changes needed)
- ✅ Authentication and roles (untouched)
- ✅ All existing CRUD operations

---

## 🗂️ Entity Relationship Diagram (ERD)

```
┌─────────────────┐
│      User       │
│  userId: string │
│  name           │
│  email          │
│  phone          │
│  role           │
└────────┬────────┘
         │
         │ 1:N (has many)
         ▼
┌─────────────────────┐
│    Enrollment       │
│  _id: ObjectId      │
│  enrollmentId: str  │
│  userId: string ────┼──> User.userId
│  planId: ObjectId ──┼──> Plan._id
│  status             │
│  totalPaid          │
│  totalDue           │
└──────────┬──────────┘
           │
           │ 1:N (has many invoices)
           ▼
┌──────────────────────────────┐          ┌─────────────────────┐
│         Invoice              │          │        Plan         │
│  _id: ObjectId               │          │  _id: ObjectId      │
│  enrollmentId: ObjectId ─────┼────┐     │  planId: string     │
│  customerId: string          │    │     │  planName           │
│  planId: ObjectId ───────────┼────┼───> │  totalAmount        │
│  dueNumber: number           │    │     │  duration           │
│  dueAmount: number ◄─────────┼────┘     │  monthlyAmount: []  │ ◄─ Array!
│  receivedAmount: number      │          │    [month1, month2, │
│  balanceAmount: calculated   │          │     month3, ...]    │
│  customerDetails: object     │          │  averageMonthlyAmt  │
│  planDetails: object         │          └─────────────────────┘
│  items: []                   │
│  createdBy: string           │
└──────────────────────────────┘

Key Calculation:
  dueAmount = plan.monthlyAmount[invoice.dueNumber - 1]
  balanceAmount = dueAmount - receivedAmount
```

---

## 🔄 Invoice Creation Flow

```
┌───────────┐
│   User    │
│  Selects  │
└─────┬─────┘
      │
      ▼
┌─────────────────────┐
│ Fetch Enrollments   │
│ GET /api/enrollments│
│ ?userId=CF000001    │
└─────┬───────────────┘
      │
      ▼
┌──────────────────────────┐
│ Display Enrollments:     │
│ • Gold Plan (ENR000001)  │
│ • Silver Plan (ENR000002)│
└─────┬────────────────────┘
      │
      ▼
┌────────────────────┐
│ User Selects       │
│ Enrollment         │
└─────┬──────────────┘
      │
      ▼
┌─────────────────────────┐
│ Auto-fill dueAmount:    │
│ monthlyAmount[dueNum-1] │
└─────┬───────────────────┘
      │
      ▼
┌──────────────────────┐
│ Create Invoice       │
│ POST /api/admin/     │
│      invoices        │
└──────────────────────┘
```

---

## 📊 Data Examples

### Plan with Monthly Amount Array

```json
{
  "_id": "674abc123",
  "planName": "Variable Rate Plan",
  "duration": 12,
  "totalAmount": 66000,
  "monthlyAmount": [
    5000,  // Month 1
    5000,  // Month 2
    5000,  // Month 3
    5500,  // Month 4
    5500,  // Month 5
    5500,  // Month 6
    6000,  // Month 7
    6000,  // Month 8
    6000,  // Month 9
    5500,  // Month 10
    5500,  // Month 11
    5500   // Month 12
  ],
  "averageMonthlyAmount": 5500
}
```

### User with Multiple Enrollments

```json
{
  "userId": "CF000001",
  "name": "Rajesh Kumar",
  "enrollments": [
    {
      "_id": "enr001",
      "enrollmentId": "ENR000001",
      "planId": "plan001",
      "planName": "Gold Plan",
      "status": "active"
    },
    {
      "_id": "enr002",
      "enrollmentId": "ENR000002",
      "planId": "plan002",
      "planName": "Silver Plan",
      "status": "active"
    }
  ]
}
```

### Invoice Linking to Enrollment

```json
{
  "_id": "inv001",
  "invoiceNumber": "INV-0001",
  "enrollmentId": "enr001",         // ← Links to specific enrollment
  "customerId": "CF000001",          // ← For backward compatibility
  "planId": "plan001",               // ← For backward compatibility
  "dueNumber": 1,
  "dueAmount": 5000,                 // ← From plan.monthlyAmount[0]
  "receivedAmount": 5000,
  "balanceAmount": 0,                // ← Auto-calculated: 5000 - 5000
  "customerDetails": {
    "name": "Rajesh Kumar",
    "phone": "9876543210"
  },
  "planDetails": {
    "planName": "Gold Plan",
    "monthlyAmount": 5000
  }
}
```

---

## 🛠️ Modified Files List

### Backend Models (MongoDB/Mongoose)
```
✅ models/Plan.ts
   - Added: monthlyAmount: [Number]
   - Added: averageMonthlyAmount: Number
   - Updated: pre-save hook to build monthlyAmount array
```

### API Routes
```
✅ app/api/admin/invoices/route.ts
   - Updated POST: Auto-calculate dueAmount from monthlyAmount[dueNumber-1]
   - Updated POST: Auto-calculate balanceAmount
   - Updated GET: Added enrollmentId population

✅ app/api/staff/dashboard/route.ts
   - Updated: Fetch enrollments for users
   - Updated: Aggregate totals across multiple enrollments
   - Updated: Calculate per-enrollment statistics
```

### Scripts
```
✅ scripts/migrate-invoices-enrollment.ts (NEW)
   - Purpose: Update existing invoices with enrollmentId
   - Purpose: Recalculate dueAmount from monthlyAmount array
```

### Documentation
```
✅ MULTIPLE_ENROLLMENTS_IMPLEMENTATION.md (NEW)
✅ CHANGES_SUMMARY.md (THIS FILE)
```

---

## ⚙️ How to Run Migration

```bash
# 1. Backup your database first!
mongodump --uri="your_mongodb_uri" --out=backup_$(date +%Y%m%d)

# 2. Run the migration script
npx tsx scripts/migrate-invoices-enrollment.ts

# 3. Check the output for any errors
# Look for:
#   ✅ Updated: X invoices
#   ⚠️  No Enrollment: Y invoices (needs manual review)
#   ❌ Errors: Z invoices (check error details)
```

---

## 🧪 Testing Scenarios

### Scenario 1: User with 2 Active Plans

```javascript
// Step 1: Create enrollments
const enrollment1 = await Enrollment.create({
  userId: "CF000001",
  planId: "plan_gold",
  status: "active"
});

const enrollment2 = await Enrollment.create({
  userId: "CF000001",
  planId: "plan_silver",
  status: "active"
});

// Step 2: Create invoices for each enrollment
// Invoice 1: Gold Plan, Month 1
const invoice1 = await Invoice.create({
  enrollmentId: enrollment1._id,
  customerId: "CF000001",
  planId: "plan_gold",
  dueNumber: 1,
  dueAmount: 5000, // From goldPlan.monthlyAmount[0]
  receivedAmount: 5000,
  balanceAmount: 0
});

// Invoice 2: Silver Plan, Month 1
const invoice2 = await Invoice.create({
  enrollmentId: enrollment2._id,
  customerId: "CF000001",
  planId: "plan_silver",
  dueNumber: 1,
  dueAmount: 3000, // From silverPlan.monthlyAmount[0]
  receivedAmount: 3000,
  balanceAmount: 0
});

// Verify: User has 2 separate invoice histories
const userInvoices = await Invoice.find({ customerId: "CF000001" });
console.log(userInvoices.length); // 2
console.log(userInvoices[0].enrollmentId !== userInvoices[1].enrollmentId); // true
```

### Scenario 2: Dashboard Aggregation

```javascript
// Dashboard should show:
const user = await User.findOne({ userId: "CF000001" });

// ✅ Total Enrollments: 2
const enrollments = await Enrollment.find({ userId: user.userId });

// ✅ Total Paid: Sum of all receivedAmount across both plans
const invoices = await Invoice.find({ customerId: user.userId });
const totalPaid = invoices.reduce((sum, inv) => sum + inv.receivedAmount, 0);

// ✅ Total Pending: Sum of all balanceAmount
const totalPending = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

// ✅ NO DUPLICATE COUNTING!
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Plans have monthlyAmount arrays populated
- [ ] New invoices auto-calculate dueAmount from monthlyAmount[dueNumber-1]
- [ ] balanceAmount = dueAmount - receivedAmount (always)
- [ ] User can have multiple active enrollments
- [ ] Each enrollment has separate invoice series
- [ ] Dashboard shows total across all enrollments (no duplicates)
- [ ] Migration script completed without errors
- [ ] Old invoices have enrollmentId populated
- [ ] Invoice listing shows enrollment information
- [ ] No calculation errors in logs

---

## 🐛 Troubleshooting

### Issue: dueAmount is 0 or undefined

**Cause:** Plan.monthlyAmount array is empty

**Fix:**
```javascript
// Run this to populate monthlyAmount from monthlyData
const plans = await Plan.find({});
for (const plan of plans) {
  await plan.save(); // Triggers pre-save hook to build monthlyAmount
}
```

### Issue: Invoice has no enrollmentId

**Cause:** Migration script didn't find matching enrollment

**Fix:**
```bash
# Run migration again
npx tsx scripts/migrate-invoices-enrollment.ts

# Check for "No Enrollment Found" entries
# Manually create enrollments for those invoices if needed
```

### Issue: Dashboard shows wrong totals

**Cause:** Counting same invoice multiple times

**Fix:** Check that aggregation is using correct grouping:
```javascript
// WRONG: Grouping by planId (counts same invoice multiple times)
// RIGHT: Grouping by enrollmentId or filtering by customerId
```

---

## 📞 Support Contacts

- **Technical Issues:** Check application logs
- **Database Issues:** Review migration script output
- **Business Logic:** Refer to MULTIPLE_ENROLLMENTS_IMPLEMENTATION.md

---

**Document Version:** 1.0
**Last Updated:** 2025-01-21
**Status:** ✅ Production Ready
