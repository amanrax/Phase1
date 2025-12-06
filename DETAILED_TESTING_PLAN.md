# Detailed Testing Plan - Step by Step Validation

## Critical Issues to Test & Fix

### 1. OperatorManagement Modal Form
**Status**: NEEDS TESTING
**Expected**: Modal should ONLY show when "+ Create Operator" is clicked
**Steps**:
- [ ] 1a. Navigate to /operator-management
- [ ] 1b. Verify operator list is shown initially
- [ ] 1c. Click "+ Create Operator" button
- [ ] 1d. VERIFY: Modal overlay appears with form
- [ ] 1e. VERIFY: Form has required field markers (*)
- [ ] 1f. VERIFY: Form has placeholder text on all fields
- [ ] 1g. Try to submit empty form - should show validation error
- [ ] 1h. Close modal by clicking ✕ or Cancel
- [ ] 1i. VERIFY: List is still visible after closing modal

**Issues Found**: 
- [ ] List not showing/visible?
- [ ] Modal not appearing?
- [ ] Validation not working?

---

### 2. FarmersList - Undefined Values & Filters
**Status**: NEEDS TESTING
**Expected**: 
- No "undefined" text
- Filter counts correct (All/Active/Pending/Inactive)
- Review button works with modal
**Steps**:
- [ ] 2a. Navigate to /farmers (FarmersList page)
- [ ] 2b. VERIFY: No "undefined" text in farmer names
- [ ] 2c. Check filter tab counts - click "All" tab
- [ ] 2d. Record count for "All" (should show total)
- [ ] 2e. Click "Active" tab - should show different count
- [ ] 2f. Click back to "All" - count should be same as 2d
- [ ] 2g. Click "Review" button on a farmer
- [ ] 2h. VERIFY: Modal opens with Status dropdown + Remarks
- [ ] 2i. Try different statuses in dropdown
- [ ] 2j. Close modal and verify table/cards still visible

**Issues Found**:
- [ ] "undefined" still appearing?
- [ ] Filter counts wrong?
- [ ] Review button not working?
- [ ] Modal not opening?

---

### 3. AdminReports - Export & Dashboard Data
**Status**: NEEDS TESTING
**Expected**:
- Compact "Export" dropdown menu
- 5 dashboard metric cards with real data
- Farmer table populated
**Steps**:
- [ ] 3a. Navigate to /admin-reports
- [ ] 3b. VERIFY: See 5 metric cards (Total Farmers, Total Operators, New This Month, Active Status, Pending)
- [ ] 3c. VERIFY: Each metric card shows a NUMBER (not 0 or empty)
- [ ] 3d. VERIFY: Export button is a single button with dropdown
- [ ] 3e. Click "Export" button dropdown
- [ ] 3f. VERIFY: See 4 options (CSV, Excel, PDF, Print)
- [ ] 3g. Click each export option
- [ ] 3h. VERIFY: Files download or print dialog appears
- [ ] 3i. Scroll down to farmer table
- [ ] 3j. VERIFY: Farmer table shows data (Farmer ID, Name, District, Status)
- [ ] 3k. Test on mobile - verify responsive

**Issues Found**:
- [ ] Metrics showing 0 or empty?
- [ ] Export button not showing?
- [ ] Export options missing?
- [ ] Farmer table empty?
- [ ] Mobile layout broken?

---

### 4. AdminSupplyRequests - Filter Counts
**Status**: NEEDS TESTING
**Expected**:
- All tab shows TOTAL count
- Counts don't change when switching tabs
- Each filter shows correct filtered items
**Steps**:
- [ ] 4a. Navigate to /admin-supply-requests
- [ ] 4b. Note the "All (X)" count
- [ ] 4c. Click "Pending" tab - note its count
- [ ] 4d. Click back to "All" - SHOULD BE SAME AS 4b
- [ ] 4e. Verify Pending tab shows only pending items
- [ ] 4f. Click "Approved" tab
- [ ] 4g. Click back to "All" - SHOULD STILL BE SAME AS 4b
- [ ] 4h. Try each filter: Fulfilled, Rejected

**Issues Found**:
- [ ] "All" count changing?
- [ ] Filter tabs not showing items?
- [ ] Counts incorrect?

---

### 5. Global Rename - Chiefdom Management Model
**Status**: NEEDS TESTING
**Expected**: "AgriManage Pro" and "ZIAMIS" replaced everywhere
**Steps**:
- [ ] 5a. Check sidebar - should show "CMM"
- [ ] 5b. Check page headers - should show "Chiefdom Management Model"
- [ ] 5c. Check print preview - should say "Chiefdom Management Model"
- [ ] 5d. Check ID card - should say "CHIEFDOM"
- [ ] 5e. Check login page title

**Issues Found**:
- [ ] Old name still showing somewhere?
- [ ] Inconsistent naming?

---

### 6. LoginPage - Role Labels
**Status**: NEEDS TESTING
**Expected**: Text labels below role emojis (Admin, Operator, Farmer)
**Steps**:
- [ ] 6a. Navigate to login page
- [ ] 6b. VERIFY: See 3 role buttons with emojis
- [ ] 6c. VERIFY: Text labels visible: "Admin", "Operator", "Farmer"
- [ ] 6d. Test on mobile - labels should be responsive
- [ ] 6e. Click each role button - should update active state

**Issues Found**:
- [ ] Labels not showing?
- [ ] Mobile labels broken?

---

### 7. FarmerDashboard - Mobile Layout & ID Card Modal
**Status**: NEEDS TESTING
**Expected**:
- Personal info doesn't overflow
- ID card modal responsive
**Steps**:
- [ ] 7a. Login as farmer (test credentials)
- [ ] 7b. Navigate to /farmer-dashboard
- [ ] 7c. Test on mobile (small screen)
- [ ] 7d. VERIFY: Personal info section fits on screen
- [ ] 7e. VERIFY: No horizontal scrolling needed
- [ ] 7f. Click "View ID Card" button
- [ ] 7g. VERIFY: Modal appears and fits screen
- [ ] 7h. VERIFY: Modal content readable (text not too small)
- [ ] 7i. Close modal by clicking ✕
- [ ] 7j. Test on tablet and desktop

**Issues Found**:
- [ ] Overflow issues?
- [ ] Modal too large?
- [ ] Text too small on mobile?

---

## Testing Environment Setup

### Test Credentials
```
ADMIN:
- Email: admin@ziamis.gov.zm
- Password: Admin@2024

OPERATOR:
- Email: operator1@ziamis.gov.zm
- Password: Operator1@2024

FARMER:
- NRC: (check FARMER_NRC_LOGIN_CREDENTIALS.txt)
- DOB: (check FARMER_NRC_LOGIN_CREDENTIALS.txt)
```

### Browser Testing
- [ ] Chrome Desktop (1920x1080)
- [ ] Chrome Mobile (375x667)
- [ ] Chrome Tablet (768x1024)
- [ ] Firefox Desktop
- [ ] Safari (if available)

---

## Detailed Issue Tracking

### Issue Template
**Page**: [Page Name]
**Issue #**: [Number]
**Symptom**: [What's wrong]
**Root Cause**: [Why it's happening]
**Fix Applied**: [How we fixed it]
**Verification**: [How to confirm it's fixed]

