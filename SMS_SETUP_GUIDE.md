# MSG91 SMS Integration Setup Guide

## 🎉 SMS Integration Complete!

Your Shree Eniyaa Chitfunds application now has full MSG91 SMS integration enabled. When customers receive payments, they'll automatically get SMS confirmations!

---

## 📋 What's Been Implemented

✅ **MSG91 Service** (`lib/sms.ts`)
- Send individual SMS
- Send bulk SMS
- SMS logging to database
- DLT template support
- Phone number validation

✅ **SMS API Routes** (`/api/sms/send`)
- Send SMS to customers
- Predefined templates
- Bulk sending capability

✅ **Auto SMS on Invoice Creation**
- Automatically sends payment confirmation SMS
- Includes receipt number, amount, and plan name
- Non-blocking (won't fail invoice if SMS fails)

✅ **SMS Templates**
- Payment Confirmation
- Payment Reminder
- Due Alert
- Welcome Message
- Custom Messages

---

## 🚀 Setup Instructions

### Step 1: Get MSG91 Account

1. Go to [https://msg91.com/](https://msg91.com/)
2. Sign up for an account
3. Verify your email and phone number
4. Complete KYC verification (required for production)

### Step 2: Get Your Credentials

1. **Auth Key**: 
   - Login to MSG91 dashboard
   - Go to **Settings** → **API Keys**
   - Copy your Auth Key

2. **Sender ID** (DLT Required):
   - Go to **SMS** → **Configure** → **Sender ID**
   - Apply for a sender ID (e.g., "SHRENF")
   - This requires DLT approval (takes 2-3 days)

3. **DLT Entity ID**:
   - Register on [https://www.vilpower.in/](https://www.vilpower.in/)
   - Complete DLT registration
   - Get your Entity ID

### Step 3: Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# MSG91 Configuration
MSG91_AUTH_KEY=your-actual-auth-key-here
MSG91_SENDER_ID=SHRENF
MSG91_ROUTE=4
MSG91_ENTITY_ID=your-entity-id
MSG91_DLT_TEMPLATE_ID=your-default-template-id

# Optional: Specific template IDs
MSG91_TEMPLATE_PAYMENT_CONFIRMATION=your-template-id
MSG91_TEMPLATE_PAYMENT_REMINDER=your-template-id
MSG91_TEMPLATE_DUE_ALERT=your-template-id
MSG91_TEMPLATE_WELCOME=your-template-id
```

### Step 4: Register DLT Templates

You need to register these message templates on DLT portal:

**1. Payment Confirmation Template:**
```
Dear {#var#}, we have received your payment of Rs.{#var#} for {#var#}. Receipt No: {#var#}. Thank you! - Shree Eniyaa Chitfunds
```

**2. Payment Reminder Template:**
```
Dear {#var#}, your chit fund payment of Rs.{#var#} is due on {#var#}. Plan: {#var#}. Pay now to avoid late fees. - Shree Eniyaa Chitfunds
```

**3. Due Alert Template:**
```
Dear {#var#}, your payment of Rs.{#var#} is overdue for {#var#}. Please pay immediately to avoid penalty. - Shree Eniyaa Chitfunds
```

**4. Welcome Template:**
```
Welcome to Shree Eniyaa Chitfunds, {#var#}! Your enrollment in {#var#} is confirmed. Monthly amount: Rs.{#var#}. Member No: {#var#}. Contact: 96266 66527
```

### Step 5: Update Template IDs

After DLT approval, update the template IDs in your `.env.local` file.

---

## 🧪 Testing the Integration

### Test 1: Manual SMS Send

You can test SMS sending from the staff SMS panel:

1. Login as staff/admin
2. Go to `/staff/sms`
3. Select a template
4. Enter test phone number (your own number)
5. Send test SMS

### Test 2: Invoice Creation SMS

1. Go to `/admin/invoices/create`
2. Create an invoice with payment received > 0
3. Customer should receive payment confirmation SMS
4. Check console logs for SMS status

### Test 3: Check SMS Logs

```bash
# View SMS logs in database
db.smslogs.find().sort({createdAt: -1}).limit(10)
```

---

## 📱 SMS Routes Reference

### **GET** `/api/sms/send`
Get available SMS templates

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "payment_confirmation",
      "name": "Payment Confirmation",
      "variables": ["customerName", "amount", "planName", "receiptNo"]
    }
  ]
}
```

### **POST** `/api/sms/send`
Send SMS to customers

**Request:**
```json
{
  "recipients": [
    {
      "userId": "user123",
      "phone": "9876543210",
      "name": "John Doe"
    }
  ],
  "template": "payment_confirmation",
  "templateData": {
    "amount": "5000",
    "planName": "Gold Plan",
    "receiptNo": "INV-0001"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "SMS sent to 1 recipients, 0 failed",
  "summary": {
    "total": 1,
    "sent": 1,
    "failed": 0
  }
}
```

---

## 🔧 Troubleshooting

### SMS Not Sending?

1. **Check Auth Key**: Ensure `MSG91_AUTH_KEY` is correct
2. **Phone Number Format**: Must be 10-digit Indian number (no +91)
3. **Check Credits**: Verify MSG91 account has SMS credits
4. **DLT Approval**: Ensure sender ID and templates are DLT approved
5. **Check Logs**: Look at console logs for error messages

### Common Errors

| Error | Solution |
|-------|----------|
| "Invalid auth key" | Update `MSG91_AUTH_KEY` in .env.local |
| "Invalid sender id" | Get DLT approved sender ID |
| "Template not found" | Register template on DLT portal |
| "Insufficient credits" | Recharge MSG91 account |
| "Invalid number format" | Use 10-digit format (9876543210) |

---

## 💰 Pricing (MSG91)

- **Transactional SMS**: ₹0.15 - ₹0.25 per SMS
- **Promotional SMS**: ₹0.10 - ₹0.15 per SMS
- **OTP SMS**: ₹0.15 per SMS

*Prices vary based on volume and plan*

---

## 🔐 Security Best Practices

1. ✅ Never commit `.env.local` to git
2. ✅ Use different auth keys for dev/production
3. ✅ Rotate auth keys periodically
4. ✅ Monitor SMS usage and costs
5. ✅ Validate phone numbers before sending
6. ✅ Implement rate limiting for bulk SMS

---

## 📊 Monitoring SMS

Track SMS performance in your application:

```typescript
// Get SMS logs
const logs = await SMSLog.find({
  createdAt: { 
    $gte: new Date('2025-01-01') 
  }
})
.populate('userId', 'name phone')
.sort({ createdAt: -1 });

// Success rate
const total = logs.length;
const sent = logs.filter(l => l.status === 'sent').length;
const successRate = (sent / total) * 100;
```

---

## 🎯 Next Steps

1. **Get MSG91 Account** → Sign up and verify
2. **Apply for DLT** → Register sender ID and templates
3. **Configure .env.local** → Add your credentials
4. **Test SMS** → Send test messages
5. **Go Live** → Enable for production

---

## 📞 Support

- **MSG91 Support**: https://msg91.com/help
- **DLT Support**: https://www.vilpower.in/
- **Application Issues**: Check console logs and database

---

## 🎉 You're All Set!

Your SMS integration is ready. Once you configure MSG91 credentials, customers will automatically receive payment confirmations via SMS!

**Files Modified:**
- ✅ `lib/sms.ts` - MSG91 service implementation
- ✅ `app/api/sms/send/route.ts` - SMS API routes
- ✅ `app/api/staff/invoices/route.ts` - Auto SMS on invoice creation
- ✅ `.env.example` - Environment variables template

**Happy Texting! 📱**
