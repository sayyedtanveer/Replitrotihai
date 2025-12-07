# Quick Test Cases - Scheduled Delivery Feature

## Test Environment
- **Server:** Running on http://localhost:5000
- **Status:** ✅ Ready for testing
- **Database:** All delivery slots seeded (slot1-slot5)

---

## TEST #1: Auto-Delivery Time Calculation

**Scenario:** User adds Roti to cart, proceeds to checkout WITHOUT selecting a delivery slot

**Steps:**
1. Open http://localhost:5000
2. Add Roti items to cart
3. Click "Checkout"
4. **Don't select any delivery slot**
5. Submit order

**Expected Result:**
- ✅ Order created successfully
- ✅ Order has `deliveryTime` set to current time + 1 hour (e.g., if current is 16:30, should be 17:30)
- ✅ Console shows: `⏰ No slot selected: auto-set delivery time to HH:MM (1 hour from now)`
- ✅ Order appears in Admin > Orders with delivery time visible

**How to verify in Admin Panel:**
1. Admin Login → Orders
2. Find the new order
3. Check: Order Details should show "Delivery Time: [time]"
4. Verify: Delivery time = current time + 1 hour

---

## TEST #2: Morning Block (8 AM - 11 AM)

**Scenario:** User tries to order Roti during blocked hours (8 AM - 11 AM)

**Steps:**
1. Adjust system clock to between 8:00 AM and 11:00 AM
2. Open http://localhost:5000
3. Add Roti to cart
4. Click "Checkout"
5. Try to place order

**Expected Result:**
- ✅ Checkout button shows: "🚫 Roti Not Available Now"
- ✅ Button is DISABLED (cannot click)
- ✅ Error message displayed: "Roti orders are not available from 8 AM to 11 AM..."
- ❌ Order CANNOT be placed

**How to reset after test:**
- Set system clock back to normal time
- Refresh browser
- Button should become enabled and show "Pay ₹[amount]"

---

## TEST #3: Chef Notification on Payment Confirm

**Scenario:** Admin confirms payment, chef should get notified immediately

**Steps:**
1. **Chef Side:** Open http://localhost:5000 in one browser tab as chef
2. **Admin Side:** Open another tab, login as admin
3. **Admin:** Go to Admin Panel → Orders (Pending Payment)
4. **Admin:** Click "Confirm Payment" on a Roti order
5. **Chef:** Watch the dashboard

**Expected Result:**
- ✅ Admin sees: "✅ Payment Confirmed"
- ✅ Chef sees: Toast notification appears (top-right corner)
- ✅ Order appears in Chef Dashboard > "Scheduled" tab
- ✅ Status shows "Confirmed"
- ✅ Delivery time is visible: "🕐 Delivery Time: HH:MM"
- ✅ Console shows: `✅ Admin confirmed payment for order ... Broadcasting to chef`

**What Chef sees:**
- Order number
- Customer name
- Delivery time in orange box: "Delivery: 09:30"
- "Prepare button enabled" message (if within 2 hours)

---

## TEST #4: Scheduled Tab Filtering

**Scenario:** Chef dashboard shows only scheduled orders in Scheduled tab

**Steps (Chef):**
1. Login as Chef
2. Go to Chef Dashboard
3. Look at tabs: "All", "Regular", "Scheduled"

**Expected Result:**

**Scheduled Tab:**
- ✅ Shows ONLY orders with delivery time
- ✅ Each order shows: "🕐 Delivery Time: HH:MM"
- ✅ All orders have "Confirmed" status
- ✅ Show order count in tab badge

**Regular Tab:**
- ✅ Shows orders WITHOUT delivery time
- ✅ These are standard delivery orders
- ✅ No delivery time field shown

**All Tab:**
- ✅ Shows all orders (both scheduled and regular)

---

## TEST #5: Prepare Button Logic

**Scenario:** Prepare button should be enabled 2 hours before delivery time

**Setup:**
1. Create Roti order with delivery time at 15:00 (3 PM)
2. Current time: 12:00 (noon)

**Expected:**
- ❌ Prepare button DISABLED (more than 2 hours away)
- Message: "Prepare button will be available at 13:00"

**After waiting 1 hour (Current time: 13:00):**
- ✅ Prepare button ENABLED (exactly 2 hours before)
- Message: "🟢 Prepare button enabled (within 2 hours of delivery)"

**After waiting more (Current time: 13:30):**
- ✅ Prepare button still ENABLED
- Message: "🟢 Prepare button enabled (within 2 hours of delivery)"

---

## TEST #6: Past Slot Time Handling

**Scenario:** User selects a delivery slot time that has already passed today

**Setup:**
1. Current time: 17:00 (5 PM)
2. Available slot: "Morning (9:00-10:30)" - already passed
3. Try to order with this slot

**Expected Result:**
- ✅ System detects slot time has passed
- ✅ Auto-schedules for NEXT DAY instead
- ✅ Order is created with next-day delivery
- ✅ Console shows: `📅 Slot time has passed, scheduling for next day`

---

## Quick Checklist

Use this to verify all fixes are working:

```
☐ TEST #1: Auto-Delivery Time
  ☐ Order created without slot selection
  ☐ deliveryTime auto-calculated (current + 1 hour)
  ☐ Console shows auto-calc message

☐ TEST #2: Morning Block (8-11 AM)
  ☐ Checkout button disabled during block hours
  ☐ Shows "Roti Not Available Now"
  ☐ Cannot place order
  ☐ Can order after 11 AM

☐ TEST #3: Chef Notification
  ☐ Admin confirms payment
  ☐ Chef gets notified (toast)
  ☐ Order appears in Scheduled tab
  ☐ Status is "Confirmed"

☐ TEST #4: Scheduled Tab Filtering
  ☐ Scheduled tab shows only orders with deliveryTime
  ☐ Regular tab shows non-scheduled orders
  ☐ Each tab displays correct order count

☐ TEST #5: Prepare Button
  ☐ Disabled when more than 2 hours from delivery
  ☐ Enabled when within 2 hours
  ☐ Shows correct status messages

☐ TEST #6: Past Slot Time
  ☐ Selecting past slot auto-schedules for next day
  ☐ Order created successfully
  ☐ Shows next-day delivery
```

---

## Common Issues & Fixes

**Issue:** Checkout button not showing block message
- **Fix:** Refresh browser, make sure it's 8-11 AM, Roti category is selected

**Issue:** Chef not seeing notification
- **Fix:** Check WebSocket connection in browser DevTools (Network tab)
- Refresh chef dashboard page

**Issue:** Delivery time not showing in admin orders list
- **Fix:** Click on order to view details, deliveryTime should be in order object

**Issue:** Prepare button not appearing
- **Fix:** Order must be "Confirmed" status and within 2 hours of delivery time

---

## How to Debug

### Check Server Logs
```bash
# Look for these messages in server console:
✅ Confirm admin confirmed payment for order...
⏰ No slot selected: auto-set delivery time...
📋 Scheduled delivery order detected...
🟢 Prepare button enabled...
```

### Check Browser Console (F12)
```javascript
// Should see WebSocket messages like:
[WebSocket] order:update received
[WebSocket] order:confirm received
```

### Check Database
Orders table should have:
- `deliveryTime` populated (HH:MM format)
- `deliverySlotId` populated (or NULL if auto-calc)
- `status` = "confirmed" (after payment confirm)
- `paymentStatus` = "confirmed"

---

## Success Criteria

✅ **All tests pass** = Feature is working correctly
- Auto-delivery time is calculated
- Morning block prevents orders 8-11 AM
- Chef notified on payment confirm
- Scheduled tab shows only scheduled orders
- Prepare button appears 2 hours before delivery

🎉 **Ready for production deployment!**
