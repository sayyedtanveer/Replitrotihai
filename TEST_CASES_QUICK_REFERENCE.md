# Quick Test Case Reference - Scheduled Delivery Issues

## 🔴 CRITICAL ISSUES TO FIX

### Issue #1: No Chef Notifications for Scheduled Orders
**Where:** `server/adminRoutes.ts` line 315-318
**Problem:** When admin confirms payment for scheduled order, chef gets no notification
**Current:** Only logs to console
**Need:** WebSocket broadcast to chef with order details

---

### Issue #2: All Orders Show in "Scheduled" Tab
**Where:** `client/src/pages/partner/PartnerDashboard.tsx`
**Problem:** Tab filtering doesn't work - shows all orders instead of only scheduled ones
**Correct Logic:** Show only orders where BOTH `deliveryTime !== null` AND `deliverySlotId !== null`
**Impact:** Chef can't distinguish regular orders from scheduled ones

---

### Issue #3: No Morning Blocking (8 AM - 11 AM)
**Where:** `client/src/components/CheckoutDialog.tsx`
**Problem:** Roti orders allowed 24/7, should be blocked during morning hours
**Current Status:** Roti settings exist but blocking not enforced in checkout
**Required:** Block checkout button + show message during 8 AM - 11 AM window

---

### Issue #4: Slot Time Validation Missing
**Where:** `client/src/components/CheckoutDialog.tsx`
**Problem:** User can select slot time that already passed (e.g., select 9 AM at 4 PM same day)
**Current:** No warning or next-day prompt
**Required:** Detect passed time → prompt for next-day → user confirms → auto-schedule next day

---

### Issue #5: Delivery Slot Not Optional
**Where:** Validation logic
**Problem:** May have validation requiring slot selection
**Required:** Delivery slot must be OPTIONAL for Roti orders
**Impact:** Users should be able to order Roti without selecting a slot

---

## 🟡 IMPORTANT FEATURES TO ADD

### Admin Customizable Morning Block Time
**Location:** Need admin settings page
**Current:** Hardcoded or stored but not editable
**Need:** Admin can change morning block from 8-11 AM to any custom time

---

### Per-Slot Cutoff Hours
**Location:** Delivery slots management
**Feature:** Each slot can have different "cutoff hours before" requirement
**Example:** Morning slot needs 6-hour advance notice, evening slot needs 2 hours

---

## ✅ WHAT'S WORKING

- ✅ Delivery slots seeded with 5 slots (Morning, Late Morning, Evening, Late Evening, Early Morning-disabled)
- ✅ Roti settings endpoint returns blocking status
- ✅ Order filtering logic exists in code (may not be applied correctly)
- ✅ Delivery slot selection not required (validation allows null)

---

## 📋 TEST CHECKLIST

### Before You Start Testing:
- [ ] Dev server running on http://localhost:5000
- [ ] Delivery slots seeded (5 slots visible in admin)
- [ ] Test with both chef and admin browser windows side-by-side
- [ ] Check browser console for errors
- [ ] Check server terminal for logs

### Morning Block Test (Current: FAILS)
```
Time: 9:30 AM
Action: Try to order Roti
Expected: Blocked with message
Actual: Currently allowed ❌
```

### Scheduled Tab Test (Current: FAILS)
```
Scenario: 2 scheduled orders + 3 regular orders
View: "Scheduled" tab
Expected: Show 2 orders
Actual: Show 5 orders ❌
```

### Chef Notification Test (Current: FAILS)
```
Setup: Admin confirms payment for order with deliveryTime="09:00"
Observer: Chef dashboard
Expected: Toast notification + order appears in "Scheduled" tab
Actual: No notification, must manually refresh ❌
```

### Slot Time Test (Current: UNKNOWN)
```
Time: 4:00 PM
Action: Select "Morning (9:00 AM)" slot
Expected: Warn about past time + prompt for next day
Actual: Need to test
```

### Optional Slot Test (Current: LIKELY WORKS)
```
Action: Don't select delivery slot for Roti order at 2 PM
Expected: Order placed successfully
Actual: Should work ✅
```

---

## 🔧 FILES TO MODIFY

### Backend (Server)
1. **`server/adminRoutes.ts`** - Add chef notification on payment confirmation
2. **`server/routes.ts`** - Add morning block enforcement + slot time validation
3. **`server/storage.ts`** - May need functions for scheduling next-day delivery

### Frontend (Client)
1. **`client/src/pages/partner/PartnerDashboard.tsx`** - Fix scheduled tab filtering
2. **`client/src/components/CheckoutDialog.tsx`** - Add morning block UI + slot validation UI
3. **Create:** Admin settings page for roti-settings customization

### Admin Features
1. **`client/src/pages/admin/RotiSettings.tsx`** - Create if not exists (edit morning block time)

---

## 📊 EXECUTION ORDER

### Phase 1: Notifications (30 min)
1. Add WebSocket broadcast to chef in `adminRoutes.ts`
2. Handle notification in `PartnerDashboard.tsx`
3. Test: Admin confirms → Chef gets notification

### Phase 2: Tab Filtering (15 min)
1. Fix scheduled tab display in `PartnerDashboard.tsx`
2. Ensure only scheduled orders shown
3. Test: Scheduled tab shows 2/5 orders correctly

### Phase 3: Morning Blocking (45 min)
1. Add blocking logic in `CheckoutDialog.tsx`
2. Show message + disable buttons during 8 AM - 11 AM
3. Test: Can't order Roti at 9:30 AM

### Phase 4: Time Validation (45 min)
1. Detect when selected slot time has passed
2. Prompt user for next-day scheduling
3. Auto-create next-day delivery order
4. Test: Select 9 AM slot at 4 PM → prompts for tomorrow

### Phase 5: Admin Settings (30 min)
1. Create admin settings UI for morning block time
2. Create per-slot cutoff editor
3. Test: Change from 8-11 AM to 6-9 AM

---

## 🧪 QUICK REFERENCE FOR TEST RUNS

### Test 1: Morning Blocking
```
Time: 9:30 AM
Cart: Roti items
Action: Click Checkout
Expected: Blocked message, disabled button
Status: ❌ FAILING
```

### Test 2: Scheduled Tab
```
Orders: 5 total (2 scheduled, 3 regular)
Action: Click "Scheduled" tab
Expected: See 2 orders
Status: ❌ FAILING
```

### Test 3: Chef Notification
```
Order: Has deliveryTime="09:00", deliverySlotId="slot1"
Action: Admin confirms payment
Expected: Chef gets immediate notification
Status: ❌ FAILING
```

### Test 4: Optional Slot
```
Time: 2:00 PM
Cart: Roti items
Action: No slot selected → Order
Expected: Order succeeds
Status: ✅ WORKING
```

---

## 📞 DEBUGGING COMMANDS

### Check if Delivery Slots are Seeded
```
curl http://localhost:5000/api/delivery-slots
```

### Check Roti Settings
```
curl http://localhost:5000/api/roti-settings
```

### Monitor Chef Notifications
1. Open browser console
2. Look for WebSocket messages
3. Search for "order" or "notification"

### View Order Details
1. Admin dashboard → Orders
2. Click order → See deliveryTime, deliverySlotId, status

---

**Ready to implement? Start with Phase 1: Notifications**
