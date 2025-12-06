# STEP-BY-STEP FIXES TODO LIST

## PHASE 1: DIAGNOSTIC & VERIFICATION

### Step 1: Check Backend API Responses
- [ ] 1.1 Test `/api/reports/dashboard` endpoint - what structure is returned?
- [ ] 1.2 Check what `/api/farmers?limit=100` returns - is it array or object with results?
- [ ] 1.3 Check `/api/operators` endpoint structure
- [ ] 1.4 Verify `/api/supplies/all` endpoint
- [ ] 1.5 Document actual API response structures

### Step 2: Test Each Page Manually
- [ ] 2.1 OperatorManagement page - can you see the list? Modal appears when clicking button?
- [ ] 2.2 FarmersList page - do farmers show without "undefined"? Do filter counts work?
- [ ] 2.3 AdminReports page - do the 5 metric cards show numbers or 0?
- [ ] 2.4 AdminSupplyRequests page - test filter tabs
- [ ] 2.5 LoginPage - are role labels showing?
- [ ] 2.6 FarmerDashboard - mobile overflow issues?

---

## PHASE 2: FIXES (Based on Issues Found)

### Fix 1: AdminReports Dashboard Data Not Loading
**Issue**: Metrics show 0 instead of real numbers
**Root Cause**: Need to verify API response structure

**Steps**:
- [ ] 2.1.1 Add console.log in AdminReports loadReports()
- [ ] 2.1.2 Log response.data to see actual structure
- [ ] 2.1.3 Adjust setReport() to correctly extract data
- [ ] 2.1.4 Test in browser console
- [ ] 2.1.5 Verify metrics now show real numbers

**Code to Add**:
```tsx
const loadReports = async () => {
  try {
    setLoading(true);
    const response = await axios.get("/reports/dashboard");
    console.log("Dashboard response:", response.data);  // ADD THIS
    
    // Figure out correct path
    const reportData = response.data.report || response.data;
    setReport(reportData || {});
    
    const farmersResponse = await axios.get("/farmers?limit=100");
    console.log("Farmers response:", farmersResponse.data);  // ADD THIS
    ...
  }
}
```

### Fix 2: AdminSupplyRequests Filter Counts Wrong
**Issue**: "All" count changes when switching filters
**Root Cause**: Filter logic loading wrong data

**Steps**:
- [ ] 2.2.1 Check if API is returning filtered data (it shouldn't)
- [ ] 2.2.2 Verify loadRequests() calls `/supplies/all` (not `/supplies?status=X`)
- [ ] 2.2.3 Test filter tab switching
- [ ] 2.2.4 Verify count stays same for "All"

### Fix 3: FarmersList Shows "undefined"
**Issue**: Farmer names showing "undefined undefined"
**Root Cause**: Data structure mismatch - might be getting wrong data from API

**Steps**:
- [ ] 2.3.1 Add console.log in FarmersList
- [ ] 2.3.2 Check what farmer object actually contains
- [ ] 2.3.3 If getFarmerName() returns "Unknown", check API response
- [ ] 2.3.4 May need to adjust data mapping

**Code to Add**:
```tsx
const fetchAllFarmers = async () => {
  setLoading(true);
  setError("");
  try {
    const data = await farmerService.getFarmers(1000, 0);
    console.log("Raw farmer data:", data);  // ADD THIS
    
    const farmerList = Array.isArray(data) ? data : (data.results || data || []);
    console.log("Processed farmer list:", farmerList);  // ADD THIS
    setAllFarmers(farmerList);
  }
}
```

### Fix 4: OperatorManagement Modal Height Too Small
**Issue**: Modal might be cutting off form (max-h-96)
**Solution**: Increase modal height and make it scrollable

**Code Change**:
```tsx
{/* OLD */}
<div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">

{/* NEW */}
<div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
```

---

## PHASE 3: VERIFICATION (After Each Fix)

### Testing Checklist for Each Fix
- [ ] Browser console shows no errors
- [ ] Feature works as expected
- [ ] Mobile responsive (test with 375px width)
- [ ] No undefined text
- [ ] Data loads correctly

---

## PRIORITY ORDER (Fix in This Order)

### HIGH PRIORITY (Must fix first):
1. **AdminReports dashboard data not showing**
   - Metrics are core functionality
   - Blocks understanding of system state

2. **FarmersList "undefined" text**
   - User-facing text issue
   - Indicates data problem

3. **AdminSupplyRequests filter counts**
   - Data consistency issue
   - Confuses users about actual numbers

### MEDIUM PRIORITY:
4. **OperatorManagement modal height**
   - UX improvement
   - Doesn't block functionality

5. **LoginPage labels**
   - Minor UX improvement
   - Already working

### LOW PRIORITY (If time):
6. **FarmerDashboard mobile overflow**
   - Already responsive
   - Minor tweaks only

---

## TESTING CREDENTIALS

```
ADMIN LOGIN:
- Email: admin@ziamis.gov.zm
- Password: Admin@2024

OPERATOR LOGIN:
- Email: operator1@ziamis.gov.zm
- Password: Operator1@2024

FARMER LOGIN:
(Check FARMER_NRC_LOGIN_CREDENTIALS.txt file)
```

---

## HOW TO DEBUG

### In Chrome DevTools:
1. Press F12 to open DevTools
2. Go to Console tab
3. Look for console.log() messages I tell you to add
4. Click on Network tab to see API responses
5. Click on a request to /reports/dashboard
6. Go to Response tab to see what the API returns

### Common Patterns:
- `console.log("Variable name:", variableName)` - prints to console
- Check Network Response to see what API actually returns
- Compare actual response with what code expects

---

## INSTRUCTIONS FOR YOU

Please:
1. Read through each issue description
2. Test each page manually in browser
3. Take screenshot or note what you see
4. Tell me:
   - Does the page load?
   - What error messages do you see?
   - Does data show or is it blank?
   - Any "undefined" text?
5. I'll provide specific code to add console.logs
6. You run the code and tell me what console shows
7. I'll fix the issues based on console output

