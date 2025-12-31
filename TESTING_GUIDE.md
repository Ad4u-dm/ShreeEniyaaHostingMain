# 🧪 Manual Testing Guide - Shri Iniya Chitfunds

Complete checklist for testing all functionality before deployment.

---

## 🚀 Setup for Local Testing

### **Step 1: Start Backend Server**

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Should show:
# 🚀 Backend server running on port 5000
# 📡 Health check: http://localhost:5000/health
```

### **Step 2: Configure and Build Frontend**

```bash
# Terminal 2 - Frontend (project root)
# Create local environment pointing to local backend
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local

# Rebuild with local backend URL
npm run export:static

# Serve the static files
cd out
npx serve -p 8000
# Or: python3 -m http.server 8000

# Frontend available at: http://localhost:8000
```

### **Step 3: Open Browser**

- Frontend: http://localhost:8000
- Backend Health: http://localhost:5000/health
- Open DevTools (F12) → Network tab (to watch API calls)

---

## ✅ Complete Testing Checklist

### **1. Authentication & Authorization** 🔐

#### Test Login
- [ ] Go to http://localhost:8000/login
- [ ] Enter invalid credentials
  - [ ] Should show error message
  - [ ] Should NOT redirect
- [ ] Enter valid credentials (create test user if needed)
  - [ ] Should show loading state
  - [ ] Should redirect to dashboard
  - [ ] Check Network tab: POST to `/api/auth/login` → 200 OK
  - [ ] Check localStorage: `auth-token` should be set

#### Test Protected Routes
- [ ] Without login, try to access http://localhost:8000/staff
  - [ ] Should redirect to /login
- [ ] After login, access http://localhost:8000/staff
  - [ ] Should load dashboard
- [ ] Test logout
  - [ ] Click logout button
  - [ ] Should clear token
  - [ ] Should redirect to login

**Console Check:**
- No CORS errors
- API calls to `http://localhost:5000/api/auth/*`

---

### **2. Dashboard & Data Loading** 📊

#### Staff Dashboard
- [ ] Login and go to http://localhost:8000/staff
- [ ] Check all widgets load:
  - [ ] Total collections
  - [ ] Pending payments
  - [ ] Active plans
  - [ ] Recent transactions
- [ ] Check charts render (if any)
- [ ] Check data is from backend (Network tab: `/api/staff/dashboard`)

#### Admin Dashboard
- [ ] Go to http://localhost:8000/admin/dashboard
- [ ] Check all statistics load
- [ ] Check revenue charts
- [ ] Verify API calls work

**Console Check:**
- `/api/dashboard/*` returns 200
- Data displays correctly
- No JavaScript errors

---

### **3. User Management** 👥

#### View Users
- [ ] Go to http://localhost:8000/staff/users
- [ ] Users list loads from backend
- [ ] Pagination works (if applicable)
- [ ] Search works
- [ ] Filter works

#### Create User
- [ ] Click "Add User" or similar
- [ ] Fill in form:
  - Name: Test User
  - Email: test@example.com
  - Phone: 9876543210
  - Role: customer/staff
- [ ] Submit
  - [ ] Should show success message
  - [ ] Should appear in users list
  - [ ] Check Network: POST to `/api/users` → 201 Created

#### Edit User
- [ ] Click edit on a user
- [ ] Modify details
- [ ] Save
  - [ ] Should update in list
  - [ ] Check Network: PUT to `/api/users/[id]`

#### Delete User
- [ ] Click delete on a test user
- [ ] Confirm deletion
  - [ ] Should remove from list
  - [ ] Check Network: DELETE to `/api/users/[id]`

**Console Check:**
- CRUD operations complete successfully
- Form validation works
- Error handling displays properly

---

### **4. Chit Plans Management** 📋

#### View Plans
- [ ] Go to http://localhost:8000/admin/plans
- [ ] Plans list loads
- [ ] All plan details display correctly

#### Create Plan
- [ ] Click "Create Plan"
- [ ] Fill in:
  - Plan name
  - Duration (months)
  - Monthly amount
  - Total members
  - Start date
- [ ] Submit
  - [ ] Should create successfully
  - [ ] Check Network: POST to `/api/plans`

#### Edit/Delete Plan
- [ ] Test edit functionality
- [ ] Test delete (if applicable)

**Console Check:**
- `/api/plans` endpoints work
- Form submissions successful

---

### **5. Enrollment Management** 📝

#### Create Enrollment
- [ ] Go to http://localhost:8000/admin/enrollments
- [ ] Click "New Enrollment"
- [ ] Select:
  - [ ] Customer (from dropdown)
  - [ ] Plan (from dropdown)
  - [ ] Member number
  - [ ] Start date
- [ ] Submit
  - [ ] Should create successfully
  - [ ] Should appear in enrollments list
  - [ ] Check Network: POST to `/api/enrollments`

#### View Enrollments
- [ ] List loads all enrollments
- [ ] Filters work (by plan, customer, status)
- [ ] Details display correctly

**Console Check:**
- Enrollment CRUD operations work
- Dropdown data loads from backend

---

### **6. Invoice Generation & Management** 🧾

#### Manual Invoice Creation
- [ ] Go to http://localhost:8000/admin/invoices/create
- [ ] Fill in invoice details:
  - [ ] Customer selection
  - [ ] Plan selection
  - [ ] Amount
  - [ ] Due date
  - [ ] Items/description
- [ ] Preview invoice
  - [ ] Should show formatted preview
- [ ] Generate PDF
  - [ ] Click "Generate PDF"
  - [ ] Should call backend: POST to `/api/invoice/generate`
  - [ ] PDF should download or display
- [ ] Save invoice
  - [ ] Should save to database
  - [ ] Check Network: POST to `/api/staff/invoices`

#### Auto Invoice Creation
- [ ] Go to http://localhost:8000/admin/invoices/manual
- [ ] Select enrollment
- [ ] Click "Generate Invoice"
  - [ ] Should create invoice automatically
  - [ ] Should calculate amounts based on plan
  - [ ] Check Network: POST to `/api/chitfund/invoice`

#### View Invoices
- [ ] Go to http://localhost:8000/admin/invoices
- [ ] Invoices list loads
- [ ] Search works
- [ ] Filter by status works
- [ ] Click on invoice to view details

#### Print Invoice
- [ ] Click print button on an invoice
- [ ] Should open http://localhost:8000/invoice/print/[id]
- [ ] Check:
  - [ ] Page loads (dynamic route works!)
  - [ ] Invoice data fetches from backend
  - [ ] Print layout displays correctly
  - [ ] Browser print dialog can be triggered

**Console Check:**
- `/api/invoice/generate` works
- `/api/staff/invoices` works
- `/api/invoices/[id]` returns data
- PDF generation successful
- Dynamic routes load correctly

---

### **7. Payment Processing** 💰

#### Record Payment
- [ ] Go to http://localhost:8000/admin/payments
- [ ] Click "New Payment" or similar
- [ ] Fill in:
  - [ ] Customer/Enrollment
  - [ ] Amount
  - [ ] Payment method
  - [ ] Date
  - [ ] Receipt number
- [ ] Submit
  - [ ] Should save successfully
  - [ ] Invoice status should update
  - [ ] Check Network: POST to `/api/payments`

#### View Payments
- [ ] Payments list loads
- [ ] Filters work (date range, customer, status)
- [ ] Total calculations correct

#### Payment Receipt
- [ ] Click "View Receipt" on a payment
- [ ] Should load http://localhost:8000/receipt/thermal/[id]
- [ ] Check:
  - [ ] Receipt data loads (dynamic route!)
  - [ ] Thermal receipt format displays
  - [ ] Print option works

**Console Check:**
- Payment endpoints work
- Receipt dynamic route loads
- Data accurate

---

### **8. SMS Functionality** 📱

#### Send Individual SMS
- [ ] Go to http://localhost:8000/staff/sms
- [ ] Select customer from dropdown
  - [ ] Dropdown should load from `/api/staff/users`
- [ ] Select template (payment reminder, confirmation, etc.)
- [ ] Preview message
  - [ ] Variables should be replaced (name, amount, etc.)
- [ ] Send SMS
  - [ ] Check Network: POST to `/api/sms/send`
  - [ ] Should show success/failure message
  - [ ] Check backend logs for MSG91 API call

#### Send Bulk SMS
- [ ] Select multiple customers
- [ ] Choose template
- [ ] Send bulk
  - [ ] Should send to all selected
  - [ ] Progress indicator shows
  - [ ] Final summary displays (sent/failed)

#### SMS Logs
- [ ] View SMS logs (if UI exists)
- [ ] Verify logs saved to MongoDB
  - [ ] Check backend: SMSLog collection

**Console Check:**
- `/api/sms/send` returns proper response
- If MSG91 credentials missing, should show clear error
- If credentials present, verify SMS actually sent (check phone)

**Note:** SMS will only actually send if you've configured real MSG91 credentials in `backend/.env`. Otherwise, it should log the attempt.

---

### **9. Reports & Analytics** 📈

#### Revenue Report
- [ ] Go to http://localhost:8000/admin/revenue
- [ ] Select date range
- [ ] Generate report
  - [ ] Should load revenue data
  - [ ] Charts display
  - [ ] Export works (if available)

#### Transaction Report
- [ ] Go to http://localhost:8000/admin/transactions
- [ ] View all transactions
- [ ] Filter by type, date, customer
- [ ] Export report

**Console Check:**
- Report APIs return data
- Charts render without errors
- Export functionality works

---

### **10. Dynamic Routes (Critical for Static Export!)** 🎯

These routes are critical because they use `[id]` parameters:

#### Invoice Print Route
- [ ] Go to any invoice
- [ ] Click "Print"
- [ ] URL should be: `/invoice/print/[some-id]`
- [ ] Page should load (not 404!)
- [ ] Data should fetch from backend
- [ ] Console: GET to `/api/invoices/[id]`

#### Thermal Receipt Route
- [ ] Go to any payment
- [ ] Click "View Receipt"
- [ ] URL: `/receipt/thermal/[some-id]`
- [ ] Page loads correctly
- [ ] Receipt data displays
- [ ] Console: GET to `/api/invoices/[id]`

**Why This Matters:**
With static export, these routes use the placeholder page we created. The client-side component fetches real data. If these don't work, the static export failed.

---

### **11. Error Handling** ⚠️

#### Test Error Scenarios
- [ ] Try to access invalid invoice ID
  - [ ] Should show error message, not crash
- [ ] Submit form with missing required fields
  - [ ] Should show validation errors
- [ ] Try API call with expired/invalid token
  - [ ] Should redirect to login
- [ ] Disconnect backend (stop backend server)
  - [ ] Try any action
  - [ ] Should show "Connection failed" type message
  - [ ] Shouldn't crash app

**Console Check:**
- Errors are caught and handled gracefully
- User sees meaningful error messages
- App doesn't crash or show blank page

---

### **12. Static Asset Loading** 🖼️

#### Check Resources Load
- [ ] Open DevTools → Network tab
- [ ] Reload http://localhost:8000
- [ ] Verify all load successfully (no 404s):
  - [ ] /_next/static/chunks/*.js (JavaScript)
  - [ ] /_next/static/css/*.css (Styles)
  - [ ] /favicon.ico
  - [ ] /icon-*.png (PWA icons)
  - [ ] Any images in /assets/
- [ ] Check console for:
  - [ ] No 404 errors
  - [ ] No MIME type errors
  - [ ] No CORS errors

#### Check Styling
- [ ] All pages styled correctly
- [ ] Buttons, forms, tables formatted
- [ ] Responsive design works (resize browser)
- [ ] Dark/light theme works (if applicable)

---

### **13. Navigation & Routing** 🧭

#### Test Navigation
- [ ] Click through all menu items
  - [ ] /login
  - [ ] /staff
  - [ ] /admin/dashboard
  - [ ] /admin/users
  - [ ] /admin/plans
  - [ ] /admin/enrollments
  - [ ] /admin/invoices
  - [ ] /admin/payments
  - [ ] /staff/sms
- [ ] Use browser back/forward buttons
  - [ ] Should work correctly
- [ ] Refresh page on any route
  - [ ] Should load that page (not 404)
  - [ ] Data should load from backend

**Console Check:**
- No routing errors
- All routes resolve correctly
- Client-side navigation smooth

---

### **14. Performance & Loading** ⚡

#### Check Loading States
- [ ] Do API calls show loading indicators?
- [ ] Are there skeleton screens or spinners?
- [ ] No long blank screens

#### Check Speed
- [ ] Initial page load (should be fast - it's static!)
- [ ] Subsequent navigation (client-side routing)
- [ ] API response times (check Network tab timing)

**Console Check:**
- No excessive re-renders (React DevTools if needed)
- API calls efficient (not duplicated)

---

## 🎯 Critical Success Criteria

Your app is ready for deployment if:

✅ **Authentication**
- Login/logout works
- Protected routes redirect properly
- Token persists across page refreshes

✅ **Data Operations**
- All CRUD operations work (Create, Read, Update, Delete)
- Forms validate and submit correctly
- API calls go to `http://localhost:5000` (or your backend URL)

✅ **Dynamic Routes**
- `/invoice/print/[id]` works with any invoice ID
- `/receipt/thermal/[id]` works with any receipt ID
- No 404s on dynamic pages

✅ **Static Export**
- `out/` folder contains all pages
- All pages load without Node.js server
- Assets load from `/_next/static/`

✅ **Backend Integration**
- Frontend correctly calls backend API
- CORS allows requests from frontend domain
- Backend returns expected data

✅ **Error Handling**
- Network errors caught and displayed
- Form validation shows errors
- App doesn't crash on invalid input

---

## 🔍 Debugging Tips

### **Issue: "Failed to fetch" or Network errors**

1. Check backend is running:
   ```bash
   curl http://localhost:5000/health
   ```

2. Check `.env.local`:
   ```bash
   cat .env.local
   # Should have: NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

3. Check browser console for CORS errors

4. Verify API URL in DevTools Network tab

### **Issue: Page shows 404 or blank**

1. Check `out/` folder has that route:
   ```bash
   ls out/staff/
   # Should have index.html
   ```

2. For dynamic routes (`[id]`), check placeholder exists:
   ```bash
   ls out/invoice/print/placeholder/
   ```

3. Check browser console for JavaScript errors

### **Issue: Styles not loading**

1. Check `out/_next/static/` exists:
   ```bash
   ls out/_next/static/
   ```

2. Check Network tab - CSS files should return 200

3. Verify no MIME type errors in console

### **Issue: Data doesn't load**

1. Check Network tab - API calls returning 200?
2. Check response data in Network tab
3. Verify backend logs show request
4. Check `NEXT_PUBLIC_API_URL` is correct

---

## 📊 Testing Checklist Summary

Use this quick checklist during testing:

**Backend Health:**
- [ ] `http://localhost:5000/health` returns OK

**Frontend Pages:**
- [ ] Login page loads
- [ ] Dashboard loads after login
- [ ] All admin pages load
- [ ] All staff pages load

**API Calls:**
- [ ] Auth endpoints work
- [ ] User CRUD works
- [ ] Plans CRUD works
- [ ] Invoices CRUD works
- [ ] Payments CRUD works
- [ ] SMS sending works

**Dynamic Routes:**
- [ ] Invoice print loads
- [ ] Receipt thermal loads

**Functionality:**
- [ ] Create invoice works
- [ ] Generate PDF works
- [ ] Record payment works
- [ ] Send SMS works

**No Errors:**
- [ ] Browser console clean
- [ ] Network tab shows all 200s
- [ ] No CORS errors

---

## 🚀 After Testing Passes

When all tests pass:

1. **For Production:**
   ```bash
   # Update to production backend URL
   echo "NEXT_PUBLIC_API_URL=https://chitfund-backend.onrender.com" > .env.local
   
   # Rebuild
   rm -rf out .next
   npm run export:static
   ```

2. **Deploy:**
   - Upload `out/` to Hostinger
   - Push code to GitHub (for backend auto-deploy)

3. **Test Production:**
   - Repeat critical tests on live URLs
   - Verify backend URL in Network tab
   - Check CORS allows your Hostinger domain

---

**Happy Testing! 🎉**

If you find bugs, fix them, rebuild with `npm run export:static`, and re-test.
