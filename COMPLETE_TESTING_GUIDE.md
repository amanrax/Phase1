# COMPLETE TESTING & DEBUGGING GUIDE

## What's Been Fixed in This Latest Commit

1. **AdminReports** - Better handling of API response structures
2. **OperatorManagement** - Modal now taller (90vh instead of 96 max-h)
3. **FarmersList** - Better API response parsing
4. **AdminSupplyRequests** - Handles different API response formats

---

## HOW TO TEST EACH PAGE

### TEST 1: OPERATOR MANAGEMENT PAGE
**URL**: http://localhost:5173/operator-management

**What to test**:
1. Page loads with operator list visible ✓
2. "+ Create Operator" button in top right ✓
3. Click button → Modal overlay appears ✓
4. Modal has form fields: First Name, Last Name, Email, Phone, Province, District, Password, Confirm Password ✓
5. All fields have placeholder text ✓
6. Required fields have red asterisk (*) ✓
7. Try clicking "Create" without filling fields → shows validation error ✓
8. Fill all fields and click "Create" → operator created or shows error ✓
9. Click "Cancel" → modal closes ✓
10. Operator list still visible ✓

**If anything is wrong**:
- [ ] Modal not appearing? Check browser console for errors
- [ ] Form fields missing? Check if component loaded correctly
- [ ] List not showing? Might be API issue - check Network tab in DevTools

---

### TEST 2: FARMERS LIST PAGE
**URL**: http://localhost:5173/farmers

**What to test**:
1. Page loads with farmer list ✓
2. Do you see farmer names without "undefined"? ✓
3. Check each column:
   - Farmer ID (should be like "ZM12345")
   - Name (should be actual names, not "undefined")
   - Phone (should be phone numbers or "-")
   - District (should be district names)
   - Status (should show ✓ Registered, ⏳ Pending, or ✗ Inactive)
   - Date (registration date)

4. Filter tabs at top:
   - Click "All" → note the count, e.g., "All (15)"
   - Click "Active" → note its count, e.g., "Active (12)"
   - Click back to "All" → should show SAME count as before
   - Try "Pending" and "Inactive" tabs
   - Counts should be consistent

5. Review button:
   - Click "Review" button on any farmer
   - Modal should appear with:
     - Farmer name at top
     - Status dropdown
     - Remarks textarea
     - Update Status and Cancel buttons
   - Try changing status in dropdown
   - Click "Update Status" or "Cancel"
   - Modal should close

**If anything is wrong**:
- [ ] "undefined" text showing?
  - Check browser Network tab → `/farmers` response
  - Post response JSON in bug report
- [ ] Filter counts wrong?
  - Click filter tabs and note each count
  - Check if "All" count changes
  - Post counts in bug report
- [ ] Review modal not opening?
  - Check browser console for JavaScript errors
  - Look for error messages in red

---

### TEST 3: ADMIN REPORTS PAGE
**URL**: http://localhost:5173/admin-reports

**What to test**:
1. Page loads ✓
2. Five metric cards should appear:
   - Total Farmers (shows a number)
   - Total Operators (shows a number)
   - New This Month (shows a number)
   - Active Status (shows a number)
   - Pending Verification (shows a number)

**If metrics show 0**:
- [ ] This is likely an API response issue
- Open browser DevTools (F12)
- Go to Network tab
- Click on /reports/dashboard request
- Go to Response tab
- Copy the JSON response
- Send it to me

**If metrics are empty or blank**:
- [ ] API might not be returning data
- Same process as above

3. Export button:
   - Top right should have "📥 Export" button
   - Click it → dropdown menu appears
   - Should see: CSV, Excel, PDF, Print
   - Click each one → file should download or print dialog appears

4. Farmer table below:
   - Should show list of farmers with columns:
     - Farmer ID
     - Name
     - District
     - Status
     - Registered date
   - If empty, might be API issue

**If anything is wrong**:
- [ ] Metrics showing 0? Check API response (see above)
- [ ] Export dropdown not appearing? Check browser console
- [ ] Farmer table empty? Check if `/farmers` API is returning data
- [ ] On mobile? Scroll to see all - should adapt to small screen

---

### TEST 4: ADMIN SUPPLY REQUESTS PAGE
**URL**: http://localhost:5173/admin-supply-requests

**What to test**:
1. Page loads ✓
2. Filter tabs at top:
   - All (X) - note the number
   - Pending (X)
   - Approved (X)
   - Fulfilled (X)
   - Rejected (X)

3. Click through each tab:
   - "All" shows all items
   - "Pending" shows only pending
   - Click "All" again → count should be SAME as first time
   - "Approved", "Fulfilled", "Rejected" show filtered items

4. Supply request list/table:
   - Shows farmer name, items, quantity, urgency, status
   - Has "✏️" edit button and "🗑️" delete button
   - Click edit → modal appears to update status

**If filter counts are wrong**:
- [ ] Click each tab and note counts
- [ ] Check if "All" count changes (it shouldn't)
- [ ] Send me the counts in bug report

**If requests not showing**:
- [ ] API might not be returning data
- [ ] Check Network tab for `/supplies/all` response
- [ ] Send me the response JSON

---

### TEST 5: LOGIN PAGE
**URL**: http://localhost:5173 (or just /login)

**What to test**:
1. Page loads ✓
2. Three role buttons should show:
   - 👨‍💼 Admin
   - 📋 Operator
   - 👨‍🌾 Farmer

3. Under the emojis should see text labels:
   - "Admin"
   - "Operator"
   - "Farmer"

4. Click each role button → active state changes (darker/highlighted)
5. Form below shows different fields based on role:
   - Admin: Email address field
   - Operator: Email address field
   - Farmer: NRC number + Date of Birth fields

**If labels not showing**:
- [ ] Check if text is there but too small (zoom in)
- [ ] Check on mobile (might be hidden)
- [ ] Check browser console for errors

---

### TEST 6: FARMER DASHBOARD (Mobile)
**URL**: http://localhost:5173/farmer-dashboard (after farmer login)

**What to test**:
1. Login as farmer first using credentials from FARMER_NRC_LOGIN_CREDENTIALS.txt
2. Should redirect to farmer dashboard
3. On mobile (use Chrome DevTools to simulate 375px width):
   - Personal info section doesn't overflow right
   - Can scroll left/right normally (no unexpected overflow)
   - All text visible
4. Scroll down to "View ID Card" button
5. Click it → modal opens showing farmer ID card
6. Modal should:
   - Fit on mobile screen
   - Not be too large
   - Show card content clearly
   - Have ✕ close button
7. Click ✕ → modal closes

**If overflow issues**:
- [ ] Take screenshot showing overflow
- [ ] Tell me what text is cut off
- [ ] Tell me on what device size (mobile/tablet/desktop)

---

## COMMON ISSUES & HOW TO DEBUG

### Issue: "Page shows blank" or "Loading spinner stuck"
**Debug steps**:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Click on error → see what file and line number
5. Tell me the error message

### Issue: "Data not showing" or "All zeros"
**Debug steps**:
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page (F5)
4. Look for red entries (failed requests)
5. Click on API request (like `/reports/dashboard`)
6. Go to Response tab
7. Copy the JSON response
8. Tell me what you see

### Issue: "Modal not appearing" or "Button doesn't work"
**Debug steps**:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for JavaScript errors (red text)
4. If you see error, tell me the message
5. Try clicking button again and watch console
6. Does error appear? Tell me what it says

---

## QUICK TEST CHECKLIST

- [ ] OperatorManagement: Modal appears and form works
- [ ] FarmersList: No "undefined" text, filter counts correct
- [ ] AdminReports: 5 metrics show numbers, export dropdown works
- [ ] AdminSupplyRequests: Filter counts stay consistent
- [ ] LoginPage: Role labels visible
- [ ] FarmerDashboard Mobile: No overflow, modal responsive

---

## IF YOU FIND ISSUES

For each issue, please provide:
1. **What page** were you testing?
2. **What did you expect** to happen?
3. **What actually happened**?
4. **Screenshot** or description of what you see
5. **Browser console errors** (if any)
6. **API response** (if data issue - from Network tab)

---

## TEST ACCOUNT CREDENTIALS

Find actual test credentials in:
- `/workspaces/Phase1/FARMER_NRC_LOGIN_CREDENTIALS.txt`
- Admin: admin@ziamis.gov.zm / Admin@2024
- Operator: operator1@ziamis.gov.zm / Operator1@2024

