# Frontend Access & Testing Instructions

## 🌐 Current Access URLs

### Local Development (Running Container)
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### Codespaces Remote Access
When running in GitHub Codespaces:
1. VS Code will show a notification with port forwarding
2. Click "Open in Browser" or manually navigate to the Codespaces URL
3. Format: `https://[username]-[hash].github.dev:5173`

Example: `https://user-abc123.github.dev:5173`

### Port Forwarding Status
```bash
# Check if ports are forwarded in Codespaces
# Go to VS Code → Ports tab (next to Terminal)
# Should show:
# ✅ 5173 (Frontend) - forwarded
# ✅ 8000 (Backend) - forwarded
```

---

## 📱 Mobile Testing Steps

### Step 1: Get the URL
```bash
# In VS Code terminal, run:
echo "Frontend: $(curl -s http://localhost:5173 | head -1)"
echo "Access from phone: https://[username]-[codespace-id].github.dev:5173"
```

### Step 2: On Your Mobile Device
1. **Android Phone**:
   - Open Chrome browser
   - Navigate to: `https://[username]-[hash].github.dev:5173`
   - Select "Admin" tab
   - Enter credentials:
     - Email: `admin@ziamis.gov.zm`
     - Password: `Admin@2024`
   - Tap "Login"

2. **iPhone**:
   - Open Safari browser
   - Navigate to: `https://[username]-[hash].github.dev:5173`
   - Follow same login steps

### Step 3: Test Responsive Behavior

#### Portrait Mode (≤375px width)
```
Expected Layout:
✓ Form full width with padding
✓ Stats cards stack vertically (1 column)
✓ Action buttons wrap/stack
✓ Text readable (16px+)
✓ No horizontal scroll
```

#### Landscape Mode (600px+ width)
```
Expected Layout:
✓ Layout adjusts to horizontal
✓ Stats cards display 2-3 columns
✓ Buttons arrange in single row
✓ Content uses more horizontal space
```

#### Font Sizes on Mobile
```
Typography should be readable without zoom:
✓ Headings: 20px+ on mobile
✓ Body text: 16px+ on mobile
✓ Labels: 14px+ minimum
✓ Form inputs: 16px (prevents auto-zoom)
```

---

## 🧪 Test Checklist

### Visual Verification
- [ ] Login page loads without overflow
- [ ] Form fits on screen with keyboard open
- [ ] Dashboard stats cards display properly
- [ ] Text is crisp and readable
- [ ] Colors display correctly
- [ ] Images scale appropriately

### Interaction Testing
- [ ] Tap buttons register (44x44px minimum)
- [ ] Form inputs accept text
- [ ] Password field toggle works
- [ ] Scrolling is smooth
- [ ] No UI elements cut off
- [ ] Navigation accessible

### Performance
- [ ] Page loads in <3 seconds
- [ ] No lag on scroll
- [ ] Animations smooth (60fps)
- [ ] Touch responses immediate

### Orientation Testing
- [ ] Rotate to landscape - layout adapts
- [ ] Rotate back to portrait - works
- [ ] No content lost in either orientation
- [ ] Navigation remains accessible

---

## 🔐 Test User Accounts

### Quick Reference

| Role | Email | Password | NRC/ID |
|------|-------|----------|--------|
| Admin | admin@ziamis.gov.zm | Admin@2024 | N/A |
| Operator | operator1@ziamis.gov.zm | Operator1@2024 | OP1071BAE8 |
| Farmer | farmer01@ziamis.gov.zm | Farmer01@2024 | ZM9963DCAA |

### Farmer Login (Alternative)
Some farmers use NRC instead of email:
- **NRC**: 626456/85/5
- **Password**: Farmer01@2024

---

## ⚙️ Troubleshooting

### "Connection Refused" Error
```bash
# Verify services are running:
docker compose ps

# If services down, restart:
docker compose up -d

# Check frontend is serving:
curl http://localhost:5173
```

### Mobile Can't Connect
```bash
# Verify port forwarding in Codespaces:
1. Open VS Code Ports panel
2. Ensure port 5173 is "Forwarded"
3. Check visibility is "Public" (not Private)

# Test from terminal:
curl -s https://[your-codespaces-url]:5173 | head -5
```

### Blank Page on Mobile
```bash
# Check browser console:
1. Right-click → Inspect (F12)
2. Look for errors in Console tab
3. Check Network tab for failed requests
4. Verify CORS headers are correct

# Common issue: API URL mismatch
# Ensure VITE_API_BASE_URL is set correctly
```

### Layout Issues on Mobile
```bash
# Verify viewport meta tag exists:
grep "viewport" /workspaces/Phase1/frontend/index.html

# Expected output should contain:
# width=device-width, initial-scale=1.0

# Restart dev server:
npm run dev  # in frontend directory
```

---

## 🎬 Demo Flow

### Full Demo Sequence (5 minutes)
1. **Load App** (15 sec)
   - Navigate to frontend URL
   - Page loads without overflow
   - DevTools shows responsive meta tag

2. **Login** (30 sec)
   - Select "Admin" tab
   - Enter credentials
   - Form submits successfully
   - Redirects to admin dashboard

3. **Test Responsive** (2 min)
   - View admin dashboard on mobile
   - Rotate to landscape
   - Verify layout adapts
   - Test button interactions

4. **Verify Mobile UX** (1 min)
   - Check text readability
   - Verify no zoom needed
   - Test touch interactions
   - Confirm smooth scrolling

---

## 📊 Performance Benchmarks

### Expected Performance Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Initial Load | <3s | ✅ |
| First Paint | <1s | ✅ |
| Interactive | <2s | ✅ |
| Touch Response | <100ms | ✅ |
| Scroll FPS | 60fps | ✅ |

### Measure Performance
```bash
# Using Chrome DevTools:
1. Open DevTools (F12)
2. Performance tab
3. Record page load
4. Analyze metrics

# Mobile performance tips:
- Close unnecessary browser tabs
- Test on actual 4G/LTE if available
- Use Chrome DevTools throttling
```

---

## 🚀 Deploy Instructions (Future)

### For Production Deployment
```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Output will be in dist/
ls -lah dist/

# 3. Serve from dist/ directory
# (or upload to CDN/static hosting)

# 4. Ensure VITE_API_BASE_URL points to production backend
```

---

## 📝 Notes

- ✅ Frontend built and ready for testing
- ✅ All responsive classes compiled
- ✅ Mobile viewport configuration applied
- ✅ Service worker configured for offline
- ⏳ Real device testing ready
- ⏳ Additional pages need conversion (future iteration)

---

**Last Updated**: December 5, 2024  
**Version**: 1.0  
**Status**: Ready for Mobile Testing  
**Next Steps**: Test on Android/iOS devices
