# Comprehensive Test Cases - Scheduled Delivery & Roti Ordering

## Overview
This document contains all test scenarios for:
1. **Scheduled Delivery Notification Issues** - Chef notifications when admin confirms payment
2. **Scheduled Orders Tab Display** - Ensuring only scheduled orders appear
3. **Roti Category Ordering Restrictions** - Time-based restrictions (8 AM - 11 AM block)
4. **Delivery Slot Selection Logic** - Handling past times, next-day scheduling, and optional slots
5. **Admin Customizable Cutoff Times** - Making morning blocking time configurable

---

## SECTION 1: SCHEDULED DELIVERY NOTIFICATIONS TO CHEF

### Issue: No notification to chef when admin confirms payment for scheduled orders

### TC1.1: Chef receives WebSocket notification on payment confirmation
**Precondition:**
- Admin is logged in at `/admin`
- Chef is logged in at `/partner`
- An order with `deliveryTime` and `deliverySlotId` exists with status "pending"
- Payment status is "pending"

**Steps:**
1. Navigate to `/admin/orders` tab
2. Find order with `deliveryTime` (e.g., "09:00") and status "pending"
3. Click "Confirm Payment" button
4. In payment confirmation dialog, set `paymentStatus = "confirmed"`
5. Observe chef dashboard

**Expected Result:**
- ✅ Payment status changes to "confirmed"
- ✅ Order status changes to "confirmed"
- ✅ Chef receives WebSocket notification with order details
- ✅ Chef dashboard shows toast/alert: "New scheduled order received: [Order ID] - Delivery: [Time]"
- ✅ Scheduled tab badge count increments
- ✅ Order appears in chef's "Scheduled" tab with delivery time displayed

**Actual Result (Current Bug):**
- ✅ Payment status changes to "confirmed"
- ✅ Order status changes to "confirmed"
- ❌ NO WebSocket notification sent to chef
- ❌ Chef must manually refresh to see new order
- ❌ No toast notification

**Root Cause:**
In `server/adminRoutes.ts`, line 315-318:
```typescript
// Currently only logs, doesn't broadcast to chef
console.log(`📋 Scheduled delivery order detected...`);
// Missing: broadcastToChef() or notifyChef() call
```

---

### TC1.2: Chef notification includes correct delivery time and slot info
**Precondition:** Same as TC1.1

**Steps:**
1. Order details: deliveryTime="09:00", deliverySlotId="slot1"
2. Admin confirms payment
3. Check chef's notification content

**Expected Result:**
- ✅ Notification includes:
  - Customer name
  - Delivery time "09:00"
  - Delivery slot label "Morning (9:00 AM - 10:30 AM)"
  - Order ID and items list
  - "Mark as Ready" button availability based on 2-hour window

**Actual Result (Current):**
- ❌ No notification sent

---

### TC1.3: Only scheduled orders trigger notification (not regular orders)
**Precondition:**
- Two orders exist:
  - Order A: `deliveryTime=null`, `deliverySlotId=null` (regular)
  - Order B: `deliveryTime="09:00"`, `deliverySlotId="slot1"` (scheduled)

**Steps:**
1. Admin confirms payment for Order A (regular)
2. Admin confirms payment for Order B (scheduled)

**Expected Result:**
- ✅ Order A: Normal notification (no specific delivery time)
- ✅ Order B: Special scheduled notification with time details

**Actual Result:**
- ❌ No notifications sent for either

---

## SECTION 2: SCHEDULED ORDERS TAB DISPLAY

### Issue: All orders showing in "Scheduled" tab, not just scheduled ones

### TC2.1: Only orders with deliveryTime and deliverySlotId appear in Scheduled tab
**Precondition:**
- Chef has 5 orders with mixed types:
  - Order 1: deliveryTime=null, deliverySlotId=null ❌
  - Order 2: deliveryTime="09:00", deliverySlotId="slot1" ✅
  - Order 3: deliveryTime="17:00", deliverySlotId="slot3" ✅
  - Order 4: deliveryTime="09:00", deliverySlotId=null ❌
  - Order 5: deliveryTime=null, deliverySlotId="slot1" ❌

**Steps:**
1. Navigate to `/partner` dashboard
2. Click "Scheduled" tab
3. Count displayed orders

**Expected Result:**
- ✅ Only 2 orders shown (Order 2 and Order 3)
- ✅ Orders 1, 4, 5 appear in "Orders" tab instead
- ✅ Scheduled tab badge shows count=2
- ✅ Each scheduled order shows:
  - Customer name
  - Delivery time "09:00" or "17:00"
  - Slot label
  - Status badge
  - "Mark as Ready" button (if within 2-hour window)

**Actual Result (Current Bug):**
- ❌ All 5 orders shown in "Scheduled" tab
- ❌ Regular orders mixed with scheduled orders
- ❌ No filtering logic

**Root Cause:**
In `client/src/pages/partner/PartnerDashboard.tsx`, line ~450:
```typescript
const scheduledOrders = (orders || []).filter((order: Order) => order.deliveryTime && order.deliverySlotId);
const regularOrders = (orders || []).filter((order: Order) => !order.deliveryTime || !order.deliverySlotId);
```
Logic seems correct, but may not be applied to the Scheduled tab content.

---

### TC2.2: Scheduled tab shows correct delivery information
**Precondition:** Order with deliveryTime="09:00", deliverySlotId="slot1"

**Steps:**
1. Open scheduled order in "Scheduled" tab
2. Verify displayed information

**Expected Result:**
- ✅ Displays: "Morning (9:00 AM - 10:30 AM)"
- ✅ Shows customer address
- ✅ Shows order items
- ✅ Shows "Prepare by: 7:00 AM" (2 hours before slot start)
- ✅ Status shows "Confirmed"

---

### TC2.3: Moving orders between tabs as status changes
**Precondition:** Order starts as scheduled with deliveryTime="09:00"

**Steps:**
1. Order in "Scheduled" tab with status="confirmed"
2. Chef clicks "Mark Ready" → status changes to "preparing"
3. Admin marks "Out for Delivery" → status="out_for_delivery"
4. Watch tab positions

**Expected Result:**
- ✅ Remains in "Scheduled" tab through all status changes
- ✅ Badge counts update correctly
- ✅ Visual indicator shows current status

---

## SECTION 3: ROTI CATEGORY ORDERING RESTRICTIONS

### Issue: Users can order Roti at any time; should be blocked 8 AM - 11 AM

### TC3.1: Roti ordering blocked during 8 AM - 11 AM window
**Precondition:**
- Current system time: **9:30 AM**
- Roti settings configured: morningBlockStartTime="08:00", morningBlockEndTime="11:00"
- Roti category order in cart

**Steps:**
1. Navigate to Home page
2. Add Roti items to cart
3. Click "Checkout"
4. Observe checkout dialog

**Expected Result:**
- ✅ Checkout dialog shows warning/message:
  ```
  "🚫 Roti orders not available from 8 AM to 11 AM
  Chef prepares in advance the previous day.
  Order before 11 PM for next morning delivery."
  ```
- ✅ Order button is DISABLED
- ✅ Cannot proceed to payment
- ✅ Delivery slot selector is HIDDEN/DISABLED
- ✅ User can still view menu but cannot complete order

**Actual Result:**
- ❌ User can proceed to checkout normally
- ❌ No blocking applied
- ❌ Can select delivery slot and place order

**Affects Scenarios:**
- 8:00 AM - 10:59 AM ❌ Should be blocked
- 11:00 AM - 11:00 PM ✅ Should allow (no slot required)
- 11:00 PM - 8:00 AM ✅ Should allow (slot required for next morning)

---

### TC3.2: Can order Roti after 11 AM until midnight
**Precondition:**
- Current system time: **2:00 PM**
- Roti settings: morningBlockStartTime="08:00", morningBlockEndTime="11:00"

**Steps:**
1. Add Roti to cart
2. Click "Checkout"
3. Try to proceed

**Expected Result:**
- ✅ Checkout dialog opens normally
- ✅ No blocking message
- ✅ "Order without delivery slot" option available
- ✅ Delivery slots selector available but NOT REQUIRED
- ✅ User can order for immediate/ASAP delivery
- ✅ User can optionally select slot for later same-day or next-day delivery

**Actual Result:**
- ✅ Works correctly

---

### TC3.3: Can order Roti before 8 AM for next morning delivery
**Precondition:**
- Current system time: **11:30 PM** (11:30 at night)
- Roti settings: morningBlockStartTime="08:00", morningBlockEndTime="11:00"

**Steps:**
1. Add Roti to cart
2. Click "Checkout"
3. Delivery slot selector should show morning slots

**Expected Result:**
- ✅ Checkout dialog opens
- ✅ No blocking message
- ✅ Morning delivery slots (9:00 AM, 10:30 AM) are available
- ✅ Can select morning slot for next day
- ✅ Receives message: "✅ Order confirmed for [Tomorrow] at 9:00 AM"
- ✅ Delivery slot selection is OPTIONAL
- ✅ If no slot selected, defaults to ASAP in allowed time window

---

### TC3.4: Admin can customize morning block time
**Precondition:**
- Admin is at `/admin/roti-settings` or equivalent
- Current setting: 8 AM - 11 AM

**Steps:**
1. Navigate to Roti settings page
2. Change "morningBlockStartTime" to "06:00"
3. Change "morningBlockEndTime" to "09:00"
4. Save changes
5. Test ordering at 8:30 AM

**Expected Result:**
- ✅ Settings updated successfully
- ✅ At 8:30 AM: Roti orders are NOW ALLOWED (outside new 6 AM - 9 AM window)
- ✅ At 7:30 AM: Roti orders are NOW BLOCKED (inside new window)
- ✅ Message updates to reflect new times
- ✅ Cutoff time setting is customizable per delivery slot (optional)

---

## SECTION 4: DELIVERY SLOT SELECTION LOGIC

### Issue: Handling past times, auto-scheduling next day, and optional selection

### TC4.1: User selects morning slot but current time has passed slot start time
**Precondition:**
- Current system time: **10:00 AM** (within blocked period)
- Available slots: ["09:00-10:30 AM", "17:00-18:30 PM"]
- User tries to order at **4:00 PM** (outside block period)

**Steps:**
1. Current time: 4:00 PM
2. Add Roti to cart
3. Click "Checkout"
4. Delivery slots shown:
   - "Morning (9:00 AM - 10:30 AM)" 
   - "Evening (5:00 PM - 6:30 PM)"
5. User selects "Morning (9:00 AM - 10:30 AM)"
6. Observer delivery date shown

**Expected Result:**
- ✅ System detects: Slot time (9:00 AM) has already passed today
- ✅ UI shows: ⚠️ "Morning slot not available today (time passed)"
- ✅ Option displayed: "Schedule for Tomorrow at 9:00 AM?"
- ✅ User confirms
- ✅ Order created with: `deliveryTime="09:00"`, `deliveryDate=TOMORROW`
- ✅ User sees toast: "✅ Order confirmed for [Tomorrow Date] at 9:00 AM"
- ✅ Chef sees order in "Scheduled" tab for next day

**Actual Result:**
- ❌ May allow selecting past time
- ❌ No warning about time having passed
- ❌ Unclear if order is for today or tomorrow
- ❌ No user confirmation prompt

---

### TC4.2: User selects afternoon slot that hasn't started yet
**Precondition:**
- Current system time: **3:00 PM**
- Available slots: ["09:00-10:30 AM", "17:00-18:30 PM", "18:30-20:00"]
- User selects "Evening (5:00 PM - 6:30 PM)"

**Steps:**
1. Select "Evening (5:00 PM - 6:30 PM)" slot
2. Observe delivery time

**Expected Result:**
- ✅ Delivery scheduled for TODAY at 5:00 PM
- ✅ Confirmation: "✅ Order confirmed for Today at 5:00 PM"
- ✅ No next-day prompt needed
- ✅ Cutoff validation passes (slot still available)

---

### TC4.3: Delivery slot selection is optional for Roti orders
**Precondition:**
- Current time: **2:00 PM** (outside block period)
- Roti order in cart

**Steps:**
1. Open checkout dialog
2. DO NOT select any delivery slot
3. Click "Place Order"

**Expected Result:**
- ✅ Order is placed successfully
- ✅ `deliverySlotId=null` in order
- ✅ `deliveryTime=null` in order
- ✅ Order appears in chef's regular "Orders" tab (not "Scheduled")
- ✅ No validation error about missing slot
- ✅ User sees: "✅ Order placed for ASAP delivery"

**Actual Result:**
- Likely working correctly based on current logic

---

### TC4.4: User can select different slots for same-day delivery
**Precondition:**
- Current time: **1:00 PM**
- Slots: [9:00-10:30 AM, 17:00-18:30 PM, 18:30-20:00]
- User wants delivery at 6:30 PM

**Steps:**
1. Open checkout
2. Select "Late Evening (6:30 PM - 8:00 PM)" slot
3. Submit order

**Expected Result:**
- ✅ Order scheduled for TODAY at 6:30 PM
- ✅ Confirmation shows correct time
- ✅ Chef sees order with clear delivery window

---

### TC4.5: Non-Roti categories don't require delivery slots
**Precondition:**
- Order from "Lunch & Dinner" category (not Roti)
- Checkout dialog open

**Steps:**
1. Add non-Roti items to cart
2. Click "Checkout"
3. Look for delivery slot selector

**Expected Result:**
- ✅ NO delivery slot selector shown
- ✅ NO delivery time selection required
- ✅ Order defaults to ASAP delivery
- ✅ Normal checkout flow

---

## SECTION 5: ADMIN CUSTOMIZABLE CUTOFF TIMES

### Issue: Morning block time should be customizable by admin

### TC5.1: Admin sets custom morning block time (6 AM - 9 AM)
**Precondition:**
- Admin logged in at `/admin/roti-settings`
- Current settings: 8 AM - 11 AM

**Steps:**
1. Navigate to "Roti Settings" (admin page)
2. Find "Morning Block Time" section
3. Change "Start Time" from "08:00" to "06:00"
4. Change "End Time" from "11:00" to "09:00"
5. Click "Save"

**Expected Result:**
- ✅ Settings saved successfully
- ✅ Toast: "✅ Roti settings updated"
- ✅ New block time: 6:00 AM - 9:00 AM
- ✅ At 7:00 AM: Roti blocked ❌
- ✅ At 9:30 AM: Roti allowed ✅

---

### TC5.2: Admin can customize per-slot cutoff hours
**Precondition:**
- Admin at delivery slots management page
- Slot "Morning (9:00 AM - 10:30 AM)" exists

**Steps:**
1. Click "Edit" on morning slot
2. Set "Cutoff Hours Before" to "6" (must order by 3:00 AM)
3. Save

**Expected Result:**
- ✅ Slot updated with cutoff
- ✅ User cannot order for this slot after 3:00 AM same day
- ✅ Error message: "❌ This slot requires ordering by 3:00 AM (6 hours before)"
- ✅ Slot marked unavailable in checkout after cutoff

---

### TC5.3: Global vs. per-slot cutoff priority
**Precondition:**
- Global setting: Last order time 11:00 PM
- Slot "Morning (9:00 AM)" with cutoff: 4 hours before
- Current time: 10:00 PM

**Steps:**
1. User tries to order for morning slot at 10:00 PM
2. Delivery time: 9:00 AM (need order by 5:00 AM if 4-hour cutoff)

**Expected Result:**
- ✅ Slot-specific cutoff takes precedence
- ✅ Order allowed (within global 11 PM limit)
- ✅ Order scheduled for next day 9:00 AM
- ✅ Display: "⚠️ You must place this order by 5:00 AM tomorrow for this delivery slot"

---

## SECTION 6: COMPLETE WORKFLOW SCENARIOS

### TC6.1: Complete Happy Path - Scheduled Roti Order
**Timeline:** 10:30 PM → Next Morning at 9:00 AM

**Steps:**

**10:30 PM - USER ACTION:**
1. User adds Roti items to cart
2. Opens checkout dialog
3. Sees message: "Order for next morning delivery"
4. Sees delivery slots:
   - "Morning (9:00 AM - 10:30 AM)"
   - "Late Morning (10:30 AM - 12:00 PM)"
5. Selects "Morning (9:00 AM - 10:30 AM)"
6. No delivery slot selection validation error
7. Proceeds to payment
8. Completes UPI payment

**Expected Result (10:30 PM):**
- ✅ Order created with:
  - `status="pending"`
  - `paymentStatus="pending"`
  - `deliverySlotId="slot1"`
  - `deliveryTime="09:00"`
  - `deliveryDate=TOMORROW`
- ✅ Order visible in admin pending orders
- ✅ Order NOT visible in chef dashboard yet

**11:00 PM - ADMIN ACTION:**
1. Admin navigates to `/admin/orders`
2. Finds new order
3. Verifies customer details, address, items
4. Clicks "Confirm Payment"
5. Dialog shows: Order total ₹250
6. Clicks "Confirm"

**Expected Result (11:00 PM):**
- ✅ Order status: pending → confirmed
- ✅ Payment status: pending → confirmed
- ✅ Chef receives IMMEDIATE WebSocket notification:
  ```
  {
    type: "new_order",
    orderId: "xxx",
    status: "confirmed",
    customer: "Rahul Sharma",
    deliveryTime: "09:00",
    slotLabel: "Morning (9:00 AM - 10:30 AM)",
    items: [...],
    prepareDeadline: "07:00 AM",
  }
  ```

**6:00 AM NEXT DAY - CHEF ACTION:**
1. Chef logs into dashboard
2. Opens "Scheduled" tab
3. Sees order with:
   - Status: "Confirmed"
   - Delivery: "Tomorrow 9:00 AM - 10:30 AM"
   - ⏰ Prepare Deadline: "7:00 AM" (2 hours before)
4. Prepares items
5. At 6:45 AM, clicks "Mark as Ready"
6. Order moves to "Preparing" status

**Expected Result (6:00 AM):**
- ✅ "Mark Ready" button DISABLED until 7:00 AM
- ✅ Shows countdown: "Ready in 15 mins" at 6:45 AM
- ✅ At 7:00 AM, button ENABLED
- ✅ Chef clicks, status → "preparing"

**9:00 AM - DELIVERY:**
1. Delivery agent picks up order
2. Updates status → "out_for_delivery"
3. Delivers to customer address

**Expected Result (9:00 AM):**
- ✅ Order moves through workflow
- ✅ Final status: "delivered"

---

### TC6.2: Blocked Period Scenario - User Tries to Order During 8-11 AM
**Timeline:** 9:30 AM Same Day

**Steps:**
1. Current time: 9:30 AM
2. User adds Roti to cart
3. Clicks "Checkout"

**Expected Result:**
- ✅ Checkout dialog shows blocking message
- ✅ Buttons DISABLED
- ✅ Message: "🚫 Roti orders blocked 8 AM - 11 AM. Order before 11 PM for next morning delivery."
- ✅ No delivery slot selector visible

---

### TC6.3: Ordering After 11 AM - Same Day Without Slot
**Timeline:** 2:00 PM Same Day

**Steps:**
1. Current time: 2:00 PM
2. User adds Roti to cart
3. Opens checkout
4. Does NOT select delivery slot
5. Proceeds to payment

**Expected Result:**
- ✅ No blocking message
- ✅ Delivery slot selector shown but NOT REQUIRED
- ✅ Order placed with `deliverySlotId=null`, `deliveryTime=null`
- ✅ Appears in chef's "Orders" tab (not "Scheduled")
- ✅ Chef can prepare ASAP

---

## SECTION 7: ERROR CASES & EDGE CASES

### TC7.1: Network error when sending chef notification
**Precondition:**
- WebSocket connection drops
- Admin confirms payment for scheduled order

**Expected Result:**
- ✅ Payment confirmation still succeeds
- ✅ Order status still updates to "confirmed"
- ✅ When chef reconnects, they see the order in dashboard
- ✅ No data loss

---

### TC7.2: User session expires during checkout
**Precondition:**
- User has selected delivery slot
- 30+ minutes pass without activity
- User clicks "Place Order"

**Expected Result:**
- ✅ Request fails with 401 Unauthorized
- ✅ User redirected to login
- ✅ After login, cart still contains items
- ✅ Slot selection preserved (optional)

---

### TC7.3: Slot becomes full while user is in checkout
**Precondition:**
- Slot capacity: 50 orders
- 49 orders already placed
- User selecting this slot
- Another user places 50th order
- First user tries to place order

**Expected Result:**
- ✅ Slot marked as "Full"
- ✅ First user's order fails with: "❌ Slot is full. Please select another time."
- ✅ UI updates to mark slot as unavailable

---

### TC7.4: Multiple orders in single session
**Precondition:**
- User in checkout for Roti order
- Second user places order first
- First user tries to proceed

**Expected Result:**
- ✅ Both orders created successfully
- ✅ No race condition
- ✅ Both visible in admin orders
- ✅ Chef receives notifications for both

---

## SECTION 8: ACCEPTANCE CRITERIA SUMMARY

### ✅ MUST FIX (Critical):

1. **Chef Notifications**
   - [ ] Chef receives WebSocket notification when admin confirms scheduled orders
   - [ ] Notification includes delivery time and slot info
   - [ ] Only scheduled orders (with deliveryTime + deliverySlotId) trigger special notification

2. **Scheduled Tab Display**
   - [ ] Only orders with BOTH deliveryTime AND deliverySlotId appear in "Scheduled" tab
   - [ ] Regular orders appear in "Orders" tab
   - [ ] Tab filtering correctly implemented

3. **Morning Blocking**
   - [ ] Roti orders blocked during customizable morning window (default 8 AM - 11 AM)
   - [ ] Blocking message displayed to user with clear instructions
   - [ ] Order button disabled during blocked time

4. **Time Validation**
   - [ ] If selected slot time has passed, system prompts for next-day scheduling
   - [ ] User confirmation required before next-day auto-scheduling
   - [ ] Clear messaging about delivery date

5. **Optional Slot Selection**
   - [ ] Delivery slot selection is OPTIONAL for Roti orders (no validation)
   - [ ] Can place Roti order without selecting slot
   - [ ] Non-Roti categories never require slot selection

---

### ✅ SHOULD HAVE (Important):

1. **Admin Customization**
   - [ ] Morning block time customizable in admin settings
   - [ ] Per-slot cutoff hours configurable
   - [ ] Settings persist across sessions

2. **User Feedback**
   - [ ] Clear toast messages for each action
   - [ ] Delivery date/time confirmation in order summary
   - [ ] Countdown timer for "Mark Ready" button

3. **Admin Visibility**
   - [ ] Scheduled orders clearly marked in order list
   - [ ] Delivery deadline shown prominently
   - [ ] Preparation time window clear

---

## APPENDIX: API ENDPOINTS TO VERIFY

### Delivery Slots
```
GET /api/delivery-slots
Response: [{
  id: string,
  startTime: "09:00",
  endTime: "10:30",
  label: string,
  capacity: number,
  currentOrders: number,
  cutoffHoursBefore: number,
  isActive: boolean
}]
```

### Roti Settings
```
GET /api/roti-settings
Response: {
  morningBlockStartTime: "08:00",
  morningBlockEndTime: "11:00",
  lastOrderTime: "23:00",
  blockMessage: string,
  isActive: boolean,
  isInBlockedPeriod: boolean,
  currentTime: string
}
```

### Create Scheduled Order
```
POST /api/orders
Body: {
  chefId: string,
  items: [...],
  deliverySlotId?: string, // optional
  deliveryTime?: string,   // optional (HH:mm format)
  customerName: string,
  phone: string,
  address: string
}
```

### Chef Orders
```
GET /api/partner/orders
Response: [{
  id: string,
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered",
  deliveryTime?: "09:00",
  deliverySlotId?: string,
  ...
}]
```

---

## END OF TEST CASES DOCUMENT

**Document Version:** 1.0
**Last Updated:** December 7, 2025
**Test Environment:** Development (http://localhost:5000)
