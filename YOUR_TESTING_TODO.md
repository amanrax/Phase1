# YOUR TESTING TODO LIST

## 🎯 PHASE 1: Read Documentation (10 minutes)

- [ ] Read this file (you're doing it now!)
- [ ] Read `TODAYS_FIXES.md` (explains what I fixed)
- [ ] Read `QUICK_TESTING_CHECKLIST.md` (5-minute overview)

---

## 🚀 PHASE 2: Start Environment (5 minutes)

- [ ] Ensure Docker is installed and running
- [ ] Terminal: `cd /workspaces/Phase1`
- [ ] Terminal: `docker-compose up --build`
- [ ] Wait for "listening on 0.0.0.0:8000" message
- [ ] Wait for "Uvicorn running on" message

---

## 📱 PHASE 3: Test AdminReports Page (5 minutes)

**Before testing**: Make sure backend and frontend are fully loaded in docker

1. [ ] Open browser: http://localhost:5173/admin-reports
2. [ ] Page loads without white screen?
3. [ ] Do you see 5 metric cards? (Total Farmers, Total Operators, etc.)
4. [ ] Each card shows a NUMBER (not 0, not blank)?

**If YES to all**: ✅ AdminReports is working, skip to next page

**If NO**: 
- [ ] Open DevTools (Press F12)
- [ ] Go to "Network" tab
- [ ] Refresh page (F5)
- [ ] Look for `/reports/dashboard` request
- [ ] Is it red (failed) or green (success)?
- [ ] Click it → "Response" tab → Copy the JSON
- [ ] Tell me: "AdminReports API returned: [paste JSON]"

---

## 👥 PHASE 4: Test FarmersList Page (5 minutes)

1. [ ] Open browser: http://localhost:5173/farmers
2. [ ] Page loads without white screen?
3. [ ] Do you see list of farmers?
4. [ ] Farmer names show (e.g., "John Banda") NOT "undefined"?
5. [ ] Try clicking filter tabs:
   - [ ] "All" - shows X items
   - [ ] "Active" - shows fewer
   - [ ] Click "All" again - same count as step 5a?

**If YES to all**: ✅ FarmersList is working, skip to next page

**If NO**:
- [ ] Which part is wrong?
  - [ ] Undefined text showing?
  - [ ] Filter counts changing when they shouldn't?
  - [ ] Something else?
- [ ] Open DevTools (F12)
- [ ] Go to Network tab → `/farmers` request
- [ ] Click it → Response tab → Copy the JSON
- [ ] Tell me exactly what's wrong

---

## 📦 PHASE 5: Test AdminSupplyRequests (5 minutes)

1. [ ] Open browser: http://localhost:5173/admin-supply-requests
2. [ ] Page loads without white screen?
3. [ ] See list of supply requests?
4. [ ] Filter tabs at top:
   - [ ] Click "All" - note the count (e.g., "All (15)")
   - [ ] Click "Pending" - shows fewer?
   - [ ] Click "All" again - SAME count as before?
   - [ ] Try "Approved", "Fulfilled", "Rejected"

**If YES to all**: ✅ AdminSupplyRequests is working, skip to next page

**If NO**:
- [ ] Tell me: Filter counts are changing / not changing as expected
- [ ] Open DevTools → Network tab → `/supplies/all`
- [ ] Copy Response JSON
- [ ] Tell me what you see

---

## 🔧 PHASE 6: Test OperatorManagement (5 minutes)

1. [ ] Open browser: http://localhost:5173/operator-management
2. [ ] Page loads showing list of operators?
3. [ ] See "+ Create Operator" button in top right?
4. [ ] Click the button → modal appears?
5. [ ] Modal shows form with fields:
   - [ ] First Name
   - [ ] Last Name
   - [ ] Email
   - [ ] Phone
   - [ ] Province
   - [ ] District
   - [ ] Password
   - [ ] Confirm Password
6. [ ] Click "Cancel" → modal closes?

**If YES to all**: ✅ OperatorManagement is working, skip to next page

**If NO**:
- [ ] Which part is wrong?
  - [ ] Modal not appearing?
  - [ ] Form fields missing?
  - [ ] Something else?
- [ ] Open DevTools → Console tab (red errors?)
- [ ] Take screenshot
- [ ] Tell me what's wrong

---

## 🎨 PHASE 7: Test LoginPage (2 minutes)

1. [ ] Open browser: http://localhost:5173/login
2. [ ] See three role buttons:
   - [ ] 👨‍💼 Admin
   - [ ] 📋 Operator
   - [ ] 👨‍🌾 Farmer
3. [ ] Under each emoji, see TEXT labels:
   - [ ] "Admin"
   - [ ] "Operator"
   - [ ] "Farmer"

**If YES to all**: ✅ LoginPage is working

**If NO**: Labels might be too small or hidden
- [ ] Try zooming in (Ctrl++)
- [ ] Check on mobile view (DevTools → Toggle device toolbar)
- [ ] Tell me if you can see labels

---

## 📱 PHASE 8: Test FarmerDashboard Mobile (3 minutes)

**First**: Login as a farmer
- Open: http://localhost:5173/login
- Select "Farmer" role
- Enter NRC number (find in `/workspaces/Phase1/FARMER_NRC_LOGIN_CREDENTIALS.txt`)
- Enter date of birth
- Click Login

**Then**: Test mobile layout
1. [ ] DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. [ ] Set to iPhone 12 or similar (375px width)
3. [ ] Check personal info section:
   - [ ] Text doesn't overflow off right side?
   - [ ] Can scroll normally?
   - [ ] Nothing cut off?
4. [ ] Scroll down to "View ID Card" button
5. [ ] Click it → modal opens?
6. [ ] Modal fits on phone screen?

**If YES to all**: ✅ FarmerDashboard is working

**If NO**: Tell me what overflows or is cut off

---

## 📋 PHASE 9: Summary & Next Steps

### If ALL tests passed:
✅ Everything is working! System is ready.

### If SOME tests failed:
1. [ ] List which pages are NOT working
2. [ ] For each broken page, tell me:
   - [ ] What should happen
   - [ ] What actually happens
   - [ ] Any error messages
   - [ ] Screenshot (if possible)

### If ALL tests failed:
- [ ] Check if docker-compose is running properly
- [ ] Check if both backend and frontend are loaded
- [ ] Try docker-compose up --build again

---

## 🎯 Quick Reference: What Should Work

| Page | URL | What to Expect |
|------|-----|-----------------|
| AdminReports | /admin-reports | 5 metric cards with numbers |
| FarmersList | /farmers | Farmer names (no "undefined"), filter tabs |
| AdminSupplyRequests | /admin-supply-requests | Request list, filter tabs with consistent counts |
| OperatorManagement | /operator-management | Operator list, modal for creating new operator |
| LoginPage | /login | Role selection with labels under emojis |
| FarmerDashboard | /farmer-dashboard | Personal info visible, ID card modal |

---

## 💬 How to Report Issues

For each broken page, provide:

```
PAGE: [Page Name]
URL: [http://localhost:5173/...]
EXPECTED: [What should happen]
ACTUAL: [What actually happens]
SCREENSHOT: [Paste screenshot if possible]
ERROR: [Any console errors from DevTools]
```

---

## ⏱️ Estimated Time

- Read docs: 10 min
- Start docker: 5 min
- Test AdminReports: 5 min
- Test FarmersList: 5 min
- Test AdminSupplyRequests: 5 min
- Test OperatorManagement: 5 min
- Test LoginPage: 2 min
- Test FarmerDashboard: 3 min
- Report issues: 5 min

**Total: 45 minutes**

After you report, I'll fix remaining issues (usually 15-30 minutes per issue).

---

## ✅ READY?

1. Read this list
2. Start docker-compose
3. Test each page
4. Report findings
5. I'll fix any remaining issues

**Start with Step 1: Read documentation!** 👇

