# 📋 DLT (Distributed Ledger Technology) Registration Guide

## 🇮🇳 Complete Step-by-Step Guide for SMS DLT Registration in India

---

## 📚 **What is DLT?**

DLT (Distributed Ledger Technology) is **mandatory** for all commercial SMS in India as per TRAI regulations since 2020. It prevents spam and ensures message authenticity.

### **Key Points:**
- **Mandatory** for all business SMS in India
- **Regulated by TRAI** (Telecom Regulatory Authority of India)
- **One-time registration** process
- **Takes 2-7 business days** for approval

---

## 🎯 **Step 1: Choose Your Telecom Operator's DLT Platform**

You need to register with **one** of these DLT platforms:

### **Major DLT Platforms:**

| Operator | DLT Platform | Website | Best For |
|----------|--------------|---------|----------|
| **Airtel** | Airtel DLT | https://dlt.airtel.in | Most popular, user-friendly |
| **Jio** | Jio DLT | https://dlt.jio.com | Good interface, fast approval |
| **Vi (Vodafone-Idea)** | Vi DLT | https://vildte.com | Decent option |
| **BSNL** | BSNL DLT | https://dlt.bsnl.in | Government operator |

### **💡 Recommendation: Choose Airtel DLT**
- Most user-friendly interface
- Fastest approval times
- Best documentation
- Widely used by businesses

---

## 🚀 **Step 2: DLT Registration Process**

### **Phase 1: Entity Registration (Day 1)**

#### **2.1 Go to Airtel DLT Portal**
- Visit: https://dlt.airtel.in
- Click "Register as Enterprise"

#### **2.2 Fill Entity Details**
**Required Documents:**
- ✅ **Company PAN Card**
- ✅ **GST Certificate**
- ✅ **Company Registration Certificate**
- ✅ **Authorized Person ID Proof** (Aadhar/Passport)
- ✅ **Business Address Proof**

**Entity Information:**
```
Entity Name: Shree Eniyaa Chitfunds Private Limited
Entity Type: Private Limited Company
Business Category: Financial Services
Industry: Chit Fund
Contact Person: [Your Name]
Email: [Your Business Email]
Phone: [Your Contact Number]
Address: [Your Business Address]
```

#### **2.3 Upload Documents**
- **PAN Card**: Clear, readable image
- **GST Certificate**: PDF format
- **Company Certificate**: Registration certificate
- **ID Proof**: Aadhar card of authorized person
- **Address Proof**: Electricity bill/rental agreement

#### **2.4 Submit for Verification**
- Review all details carefully
- Submit application
- **Wait 1-2 business days** for entity approval

---

### **Phase 2: Header (Sender ID) Registration (Day 2-3)**

#### **2.5 Register Sender ID**
After entity approval:

**Header Details:**
```
Header: ShreeEniyaaCFD
Header Type: Service-Explicit
Category: Financial Services
Use Case: Transactional
Description: SMS notifications for chit fund services including payment confirmations, due reminders, and account updates
```

#### **2.6 Upload Supporting Documents**
- **Company letterhead** with header justification
- **Sample SMS content** showing business use
- **Business website** (if any)

---

### **Phase 3: Content Template Registration (Day 3-5)**

#### **2.7 Create Message Templates**

**Template 1: Payment Confirmation**
```
Template Name: Payment Confirmation
Category: Financial Services
Content Type: Text
Language: English

Template Content:
Dear {#var#}, we acknowledge receipt of your payment of Rs.{#var#} for {#var#} plan on {#var#}. Receipt No: {#var#}. Current balance: Rs.{#var#}. Next due: {#var#}. Thank you! -Shree Eniyaa Chitfunds

Variables:
{#var#} = Customer Name
{#var#} = Amount
{#var#} = Plan Name  
{#var#} = Payment Date
{#var#} = Receipt Number
{#var#} = Balance Amount
{#var#} = Next Due Date
```

**Template 2: Payment Reminder**
```
Template Name: Payment Reminder
Category: Financial Services
Content Type: Text
Language: English

Template Content:
Dear {#var#}, your chit fund payment of Rs.{#var#} for {#var#} is due on {#var#}. Please pay on time to avoid late charges. Contact: {#var#}. -Shree Eniyaa Chitfunds

Variables:
{#var#} = Customer Name
{#var#} = Amount Due
{#var#} = Plan Name
{#var#} = Due Date
{#var#} = Contact Number
```

**Template 3: Welcome Message**
```
Template Name: Welcome Message
Category: Financial Services  
Content Type: Text
Language: English

Template Content:
Welcome to Shree Eniyaa Chitfunds! Your enrollment in {#var#} is confirmed. Monthly amount: Rs.{#var#}. Member ID: {#var#}. Contact us for assistance. -Shree Eniyaa Chitfunds

Variables:
{#var#} = Plan Name
{#var#} = Monthly Amount
{#var#} = Member ID
```

#### **2.8 Submit Templates**
- Review template content carefully
- Ensure all variables are properly marked
- Submit each template separately
- **Wait 2-3 business days** for approval

---

## 📋 **Step 3: Get Your DLT Credentials**

After approval, you'll receive:

### **3.1 Entity ID**
```
Entity ID: 1201234567890123456
```

### **3.2 Header ID** 
```
Header: ShreeEniyaaCFD
Header ID: 1901234567890123456
```

### **3.3 Template IDs**
```
Payment Confirmation: 1107160995825373461
Payment Reminder: 1107160995825373462  
Welcome Message: 1107160995825373463
```

---

## 🔧 **Step 4: Configure Your SMS Provider**

### **4.1 Update MSG91 Account**
- Login to MSG91 dashboard
- Go to "DLT Configuration"
- Add your Entity ID
- Map Header ID to your account
- Import approved templates

### **4.2 Update Your Application**

**Environment Variables:**
```bash
# MSG91 SMS Configuration (DLT Approved)
MSG91_API_KEY=477473AM31Mhv56918c2a8P1
MSG91_AUTH_KEY=477473AM31Mhv56918c2a8P1
MSG91_SENDER_ID=ShreeEniyaaCFD
MSG91_ROUTE=4
MSG91_COUNTRY=91
MSG91_ENTITY_ID=1201234567890123456
MSG91_TEMPLATE_PAYMENT_CONFIRMATION=1107160995825373461
MSG91_TEMPLATE_PAYMENT_REMINDER=1107160995825373462
MSG91_TEMPLATE_WELCOME=1107160995825373463
```

---

## ⏰ **Timeline & Checklist**

### **Day 1: Entity Registration**
- [ ] Choose DLT platform (Airtel recommended)
- [ ] Gather required documents
- [ ] Submit entity registration
- [ ] Wait for entity approval email

### **Day 2-3: Header Registration**  
- [ ] Submit header registration
- [ ] Upload supporting documents
- [ ] Wait for header approval

### **Day 3-5: Template Registration**
- [ ] Create message templates
- [ ] Submit each template
- [ ] Wait for template approvals

### **Day 5-7: Integration**
- [ ] Receive all approval emails
- [ ] Update SMS provider with DLT details
- [ ] Configure application
- [ ] Test SMS sending

---

## 💡 **Tips for Faster Approval**

### **Documentation Tips:**
- ✅ **High-quality scans** - clear, readable documents
- ✅ **Consistent details** - same name/address across all documents
- ✅ **Professional language** - proper grammar in templates
- ✅ **Clear variables** - use {#var#} format consistently

### **Template Tips:**
- ✅ **No promotional content** - avoid "offer", "sale", etc.
- ✅ **Clear business purpose** - transactional messages only
- ✅ **Professional tone** - formal business language
- ✅ **Include company name** - end with your business name

### **Common Rejections:**
- ❌ **Missing documents** - ensure all docs uploaded
- ❌ **Mismatched details** - verify name consistency
- ❌ **Promotional templates** - stick to transactional only
- ❌ **Incorrect variables** - use proper {#var#} format

---

## 🎯 **Cost Breakdown**

### **DLT Registration: FREE**
- Entity registration: ₹0
- Header registration: ₹0  
- Template registration: ₹0

### **SMS Costs After DLT:**
- MSG91: ₹0.20 per SMS
- Fast2SMS: ₹0.15 per SMS
- Other providers: ₹0.15-0.30 per SMS

---

## 📞 **Support Contacts**

### **Airtel DLT Support:**
- Email: dlt.support@airtel.com
- Phone: 198 (Airtel customers)
- Website: https://dlt.airtel.in

### **TRAI Helpdesk:**
- Email: advqos@trai.gov.in
- Phone: 1963

---

## 🚀 **After DLT Approval**

Once you get approval:

1. **Uncomment SMS button** in your staff interface
2. **Update environment variables** with DLT IDs  
3. **Test SMS sending** with approved templates
4. **Go live** with automated SMS notifications

**Estimated Total Time: 5-7 business days**

---

## ✅ **Quick Start Checklist**

- [ ] **Today**: Start with Airtel DLT registration
- [ ] **Day 1**: Submit entity registration  
- [ ] **Day 2**: Submit header registration
- [ ] **Day 3**: Submit template registrations
- [ ] **Day 5-7**: Receive approvals and configure SMS
- [ ] **Day 8**: Uncomment SMS features and go live!

**Good luck with your DLT registration! 🎉**