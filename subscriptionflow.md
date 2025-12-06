Subscription Flow Implementation Report

## User Flow Documentation

### Overview
The RotiHai subscription system allows customers to subscribe to meal plans for regular food deliveries. The system supports both authenticated users and guest checkout with automatic account creation.

---

### 1. CUSTOMER SUBSCRIPTION JOURNEY

#### 1.1 Browsing Subscription Plans
**Entry Point:** User opens the Subscription Drawer from the app header

**Steps:**
1. User clicks "Subscribe" or subscription icon in the header
2. SubscriptionDrawer opens with two tabs:
   - **Plans Tab:** View all available subscription plans
   - **My Subscriptions Tab:** View/manage existing subscriptions (if authenticated)

**Plan Information Displayed:**
- Plan name and description
- Price (monthly/weekly)
- Frequency (daily, weekly, etc.)
- Items included (e.g., "4 Rotis + Dal")
- Category (Roti, Lunch/Dinner, Hotel Specials)

#### 1.2 Selecting a Subscription Plan

**For Roti Category Plans:**
- User must select a delivery time slot before subscribing
- Slot selection modal shows available time slots with capacity
- Each slot shows remaining availability

**For Non-Roti Category Plans:**
- Direct subscription without slot selection
- Delivery time can be set later after subscription

---

### 2. AUTHENTICATED USER FLOW

**Precondition:** User is logged in (has valid userToken in localStorage)

**Flow:**
```
User clicks "Subscribe" on plan
        ↓
[Check if Roti category?]
        ↓ YES                    ↓ NO
Show Slot Selection Modal    Create subscription directly
        ↓                             ↓
Select delivery slot          POST /api/subscriptions
        ↓                             ↓
POST /api/subscriptions       Subscription created (pending)
with deliverySlotId                   ↓
        ↓                             ↓
Subscription created          Show Payment QR Dialog
(pending status)                      ↓
        ↓                     User scans QR / pays
Show Payment QR Dialog               ↓
        ↓                     Enter transaction ID
User scans QR / pays                 ↓
        ↓                     POST /api/subscriptions/:id/payment-confirmed
Enter transaction ID                 ↓
        ↓                     Payment submitted for verification
POST /api/subscriptions/:id/         ↓
payment-confirmed             Show success dialog
        ↓
Payment submitted for verification
        ↓
Show success dialog
```

---

### 3. GUEST USER FLOW (Subscribe Without Login)

**Precondition:** User is NOT logged in

**Flow:**
```
User clicks "Subscribe" on plan
        ↓
Guest Subscription Form opens
        ↓
[Check if Roti category?]
        ↓ YES                    ↓ NO
Show slot selection           Proceed without slot
in guest form
        ↓
User enters details:
- Name (required)
- Phone (required, 10 digits)
- Email (optional)
- Address (required)
- Delivery Slot (if Roti category)
        ↓
[Phone validation - check if exists]
        ↓ EXISTS                 ↓ NEW
Redirect to login         Create subscription via
dialog with phone         POST /api/subscriptions/public
prefilled                        ↓
                          System auto-creates user account
                          with generated password
                                 ↓
                          Auto-login user with tokens
                                 ↓
                          Show Payment QR Dialog
                                 ↓
                          Complete payment flow
```

**Guest Account Creation:**
- System generates a secure random password
- Login credentials sent via email (if provided)
- User is auto-logged in after subscription creation
- User can change password later in profile

---

### 4. PAYMENT CONFIRMATION FLOW

**Components Involved:**
- PaymentQRDialog component
- confirmPaymentMutation in SubscriptionDrawer

**Flow:**
```
Payment QR Dialog opens
        ↓
Displays:
- UPI QR code for payment
- Amount to pay
- UPI ID for manual payment
        ↓
User makes payment via UPI app
        ↓
User enters transaction ID
        ↓
Click "I have paid"
        ↓
POST /api/subscriptions/:id/payment-confirmed
with paymentTransactionId
        ↓
Server validates and queues for admin verification
        ↓
Subscription status: pending (awaiting admin confirmation)
        ↓
Success Dialog shows:
- Subscription details
- "Pending verification" message
- Next delivery date (estimated)
```

---

### 5. SUBSCRIPTION MANAGEMENT FLOWS

#### 5.1 Viewing Subscriptions
- "My Subscriptions" tab shows all user subscriptions
- Each subscription card displays:
  - Plan name and status (active/paused/pending)
  - Remaining deliveries counter
  - Next delivery date and time
  - Management buttons

#### 5.2 Pause Subscription
```
User clicks "Pause" button
        ↓
Pause Modal opens
        ↓
User selects:
- Pause start date (required)
- Resume date (optional - for scheduled resume)
        ↓
POST /api/subscriptions/:id/pause
        ↓
Subscription status → "paused"
        ↓
Deliveries pause until resumed
```

**Pause Options:**
1. **Immediate pause:** Leave resume date empty, resume manually later
2. **Scheduled pause:** Set both start and end dates

#### 5.3 Resume Subscription
```
User clicks "Resume" button
        ↓
POST /api/subscriptions/:id/resume
        ↓
Subscription status → "active"
        ↓
Next delivery scheduled for tomorrow
```

#### 5.4 Change Delivery Time
```
User clicks "Change Time" button
        ↓
Time Modal opens with slot selector
        ↓
Select new delivery time slot
        ↓
PATCH /api/subscriptions/:id/delivery-time
        ↓
Future deliveries use new time
```

---

### 6. SUBSCRIPTION RENEWAL FLOW

**Trigger:** Subscription nearing expiration (remaining deliveries ≤ 3)

**Visual Indicators:**
- Warning badge shows "Expiring Soon"
- Renew button appears on subscription card

**Flow:**
```
User clicks "Renew" button
        ↓
Renewal Confirmation Modal shows:
- Plan details
- Price
- Number of deliveries
        ↓
User clicks "Renew Now"
        ↓
POST /api/subscriptions/:id/renew
        ↓
New subscription created (linked to current)
        ↓
Payment QR Dialog opens
        ↓
Complete payment flow
        ↓
New subscription activated after payment verification
```

---

### 7. STATUS INDICATORS & BADGES

**Subscription Statuses:**
- `pending` - Awaiting payment confirmation
- `active` - Currently active, deliveries scheduled
- `paused` - Temporarily paused by user
- `expired` - All deliveries completed

**Visual Badges:**
- Active: Green badge
- Paused: Yellow badge with pause icon
- Pending Payment: Orange badge
- Expiring Soon: Red warning badge

---

### 8. KNOWN ISSUES & GAPS

**Identified During Review (December 2024):**

1. **Delivery Slot Enforcement for Roti Plans:**
   - Issue: UI shows slot selection but subscribe button doesn't always require/attach the chosen slot
   - Impact: Subscriptions may be created without mandatory slot for Roti category
   - Status: Needs fix

2. **Payment Confirmation State Refresh:**
   - Issue: After payment confirmation, schedule/remaining deliveries may show stale data
   - Impact: Users don't see immediate status update
   - Status: Needs additional queryClient invalidation

3. **Guest Phone Validation:**
   - Issue: Potential race conditions in phone existence check
   - Impact: May allow duplicate account creation attempts
   - Status: Edge case, low priority

---

## Backend Flow Documentation

Current Implementation Status
✅ Complete Flow Steps
User → Buys Subscription → active

✅ User creates subscription via /api/subscriptions endpoint
✅ Subscription status set to "pending" initially
✅ Payment transaction ID captured
✅ WebSocket notification sent to customer
Admin → Confirms Payment

✅ Admin confirms payment via /api/admin/subscriptions/:id/confirm-payment
✅ Subscription status updated to "active"
✅ isPaid flag set to true
✅ WebSocket broadcast sent to customer and admin
Admin → Assigns Chef → scheduled

✅ Admin assigns chef via /api/admin/subscriptions/:id/assign-chef
✅ Creates delivery log with status "scheduled" if delivery is today
✅ NEW: WebSocket broadcast sent to assigned chef
✅ Chef can see subscription in their dashboard
Chef → Start Preparing → preparing

✅ Chef updates status via /api/partner/subscription-deliveries/:subscriptionId/status
✅ Status changed to "preparing"
✅ NEW: WebSocket broadcast sent to all available delivery personnel
✅ Delivery boys can see and claim the delivery
Delivery Boy → Accept → accepted_by_delivery

✅ Status enum includes "accepted_by_delivery"
✅ Delivery boy claims via /api/delivery/subscription-deliveries/:id/claim
✅ Updates status to "accepted_by_delivery"
✅ Delivery person ID assigned to log
Delivery Boy → Out For Delivery → out_for_delivery

✅ Delivery boy updates via /api/delivery/subscription-deliveries/:id/status
✅ Status changed to "out_for_delivery"
✅ Valid transition from "accepted_by_delivery"
Delivery Boy → Deliver → delivered

✅ Delivery boy marks delivered via /api/delivery/subscription-deliveries/:id/status
✅ Status changed to "delivered"
✅ Subscription remaining deliveries decremented
✅ Next delivery date calculated
Cron → Auto Schedules next day → scheduled

✅ Cron job runs every 5 minutes (server/cronJobs.ts)
✅ generateDailyDeliveryLogs() creates new logs
✅ updateNextDeliveryDates() updates subscription dates
✅ New logs created with status "scheduled"
Database Schema
Subscription Delivery Status Enum
deliveryLogStatusEnum = ["scheduled", "preparing", "accepted_by_delivery", "out_for_delivery", "delivered", "missed"]

Status Transitions (Validation)
"scheduled" → ["preparing"]
"preparing" → ["accepted_by_delivery", "out_for_delivery"]
"accepted_by_delivery" → ["out_for_delivery"]
"out_for_delivery" → ["delivered", "missed"]

WebSocket Broadcasts
Payment Confirmation: subscription_update → Customer, Admin
Chef Assignment: subscription_update → Chef, Admin
Start Preparing: new_subscription_delivery → All Active Delivery Personnel
Status Updates: Delivery log updates propagate via API responses
API Endpoints
Admin
POST /api/admin/subscriptions/:id/confirm-payment - Confirm payment & activate
PUT /api/admin/subscriptions/:id/assign-chef - Assign chef & create log
PATCH /api/admin/subscriptions/:id/delivery-status - Admin manual status update
Partner (Chef)
GET /api/partner/subscriptions - Get assigned subscriptions
GET /api/partner/subscription-deliveries - Get today's deliveries
PATCH /api/partner/subscription-deliveries/:subscriptionId/status - Update to "preparing"
Delivery
GET /api/delivery/available-subscription-deliveries - Get claimable deliveries
POST /api/delivery/subscription-deliveries/:id/claim - Claim & accept delivery
PATCH /api/delivery/subscription-deliveries/:id/status - Update status
Implementation Changes Made
1. Admin Chef Assignment Broadcast
File: server/adminRoutes.ts

Added WebSocket broadcast when chef is assigned
Auto-creates delivery log if delivery is today
Notifies chef immediately via WebSocket
2. Chef Preparing Broadcast to Delivery
File: server/partnerRoutes.ts

When chef sets status to "preparing", broadcasts to all available delivery personnel
Delivery boys receive real-time notification
3. New WebSocket Function
File: server/websocket.ts

Added broadcastSubscriptionDeliveryToAvailableDelivery()
Similar to order flow, broadcasts to active delivery personnel
Complete Flow Diagram
User
 ↓ (Creates subscription)
[Subscription: pending, isPaid: false]
 ↓
Admin (Confirms payment)
 ↓
[Subscription: active, isPaid: true]
 ↓
Admin (Assigns Chef)
 ↓ [WebSocket → Chef]
[DeliveryLog: scheduled] → Chef Dashboard
 ↓
Chef (Start Preparing)
 ↓ [WebSocket → All Active Delivery Boys]
[DeliveryLog: preparing] → Delivery App (Available List)
 ↓
Delivery Boy (Claims & Accepts)
 ↓
[DeliveryLog: accepted_by_delivery]
 ↓
Delivery Boy (Out for Delivery)
 ↓
[DeliveryLog: out_for_delivery]
 ↓
Delivery Boy (Delivers)
 ↓
[DeliveryLog: delivered]
[Subscription: remainingDeliveries - 1]
 ↓
Cron Job (Next Day)
 ↓
[New DeliveryLog: scheduled]

Testing Checklist
 User creates subscription → Status: pending
 Admin confirms payment → Status: active, broadcast sent
 Admin assigns chef → Delivery log created, chef notified
 Chef starts preparing → Delivery boys notified
 Delivery boy accepts → Status: accepted_by_delivery
 Delivery boy out for delivery → Status: out_for_delivery
 Delivery boy delivers → Status: delivered, remaining decremented
 Cron creates next day log → Status: scheduled
Notes
All WebSocket broadcasts are logged with detailed summaries
Delivery personnel must be active (isActive: true) to receive notifications
Cron job runs every 5 minutes to ensure timely scheduling
Status transitions are validated server-side
Subscription flow mirrors regular order flow for consistency