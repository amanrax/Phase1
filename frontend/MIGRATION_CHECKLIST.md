# Design System Migration Checklist

## ✅ Completed Setup

- [x] Tailwind CSS v4 installed and configured
- [x] Font Awesome 6.4.0 CDN integrated
- [x] CSS variables and animations added
- [x] All UI components created (`/src/components/ui/`)
- [x] Navigation configuration centralized (`/src/config/navigation.ts`)
- [x] Example implementation created (`ExampleDashboard.tsx`)

## 🔄 Pages to Migrate

### Authentication
- [ ] `src/pages/Login.tsx` - Update to match design system login screen
  - [ ] Use green-themed background with wheat icon
  - [ ] Replace custom inputs with `FormInput` components
  - [ ] Update button styling to use `Button` component
  - [ ] Add fade-in animation

### Dashboard Pages
- [ ] `src/pages/AdminDashboard.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Replace stat cards with `StatCard` components
  - [ ] Update tables with `Table` component
  - [ ] Add proper color scheme (green/orange/blue/purple borders)

- [ ] `src/pages/OperatorDashboard.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Use `StatCard` for metrics
  - [ ] Replace custom tables with `Table` component

- [ ] `src/pages/DataEntryDashboard.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Use `StatCard` for entry statistics
  - [ ] Update tables and badges

### Farmer Management
- [ ] `src/pages/FarmerRegistration.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Add `WizardSteps` component for multi-step form
  - [ ] Replace all inputs with `FormInput` and `FormSelect`
  - [ ] Update buttons to use `Button` component
  - [ ] Wrap form sections in `Card` components

- [ ] `src/pages/FarmerList.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Replace custom table with `Table` component
  - [ ] Use `Badge` for status indicators (green/yellow/red)
  - [ ] Add search functionality in TopBar

- [ ] `src/pages/FarmerDetails.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Use multiple `Card` components for sections
  - [ ] Add `Badge` for verification status
  - [ ] Update action buttons with `Button` component

- [ ] `src/pages/FarmerEdit.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Replace inputs with `FormInput` and `FormSelect`
  - [ ] Use `Button` components for actions
  - [ ] Wrap in `Card` component

### User Management
- [ ] `src/pages/UserManagement.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Replace table with `Table` component
  - [ ] Use `Badge` for role indicators
  - [ ] Add create user button with proper styling

- [ ] `src/pages/UserForm.tsx` (Create/Edit User)
  - [ ] Wrap with `DashboardLayout`
  - [ ] Replace inputs with `FormInput` and `FormSelect`
  - [ ] Use `Button` components
  - [ ] Wrap in `Card` component

### ID Card Management
- [ ] `src/pages/IDCardManagement.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Use `Table` for card requests
  - [ ] Add `Badge` for status (Pending/Generated/Printed)
  - [ ] Update action buttons

- [ ] `src/pages/IDCardGeneration.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Use `Card` for preview section
  - [ ] Update buttons with `Button` component

### Reports & Analytics
- [ ] `src/pages/Reports.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Use `StatCard` for report metrics
  - [ ] Use `Card` for filter sections
  - [ ] Update export buttons

- [ ] `src/pages/Analytics.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Use `StatCard` for key metrics
  - [ ] Use `Card` for chart containers

### Settings & Configuration
- [ ] `src/pages/Settings.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Use `Card` for settings sections
  - [ ] Replace inputs with `FormInput` and `FormSelect`
  - [ ] Update buttons

### Other Pages
- [ ] `src/pages/Profile.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Use `Card` for profile sections
  - [ ] Update form inputs and buttons

- [ ] `src/pages/Notifications.tsx`
  - [ ] Wrap with `DashboardLayout`
  - [ ] Use `Card` for notification items
  - [ ] Add `Badge` for unread indicators

## 🎯 Per-Page Migration Steps

For each page, follow these steps:

### 1. Import Required Components
```tsx
import { 
  DashboardLayout, 
  Button, 
  FormInput, 
  FormSelect,
  StatCard,
  Card,
  Badge,
  Table,
  WizardSteps 
} from '../components/ui';
import { NAV_CONFIG } from '../config/navigation';
```

### 2. Wrap with DashboardLayout
```tsx
return (
  <DashboardLayout 
    navGroups={NAV_CONFIG}
    pageTitle="Your Page Title"
    showSearch={true}  // if needed
    onSearchChange={handleSearch}  // if needed
  >
    {/* Your content here */}
  </DashboardLayout>
);
```

### 3. Replace Custom Components
- Replace custom buttons with `<Button variant="primary|secondary|danger">`
- Replace custom inputs with `<FormInput>` or `<FormSelect>`
- Replace custom cards/containers with `<Card>`
- Replace status text with `<Badge variant="green|yellow|red">`
- Replace custom tables with `<Table>`

### 4. Update Colors
- Primary actions: `bg-green-700 hover:bg-green-800`
- Secondary actions: `bg-white border border-gray-300`
- Text colors: `text-gray-800` (headings), `text-gray-600` (body)
- Backgrounds: `bg-slate-50` (page), `bg-white` (cards)

### 5. Add Animations
- Add `fade-in` class to main content sections
- Ensure transitions on hover states (`transition` class)

### 6. Test Responsiveness
- Mobile (320px-767px): Stack cards vertically, hide sidebar
- Tablet (768px-1023px): 2-column grid
- Desktop (1024px+): 4-column grid for stats

## 🔍 Quality Checklist (Per Page)

After migrating each page, verify:

- [ ] Page uses `DashboardLayout` wrapper
- [ ] All colors match design system palette
- [ ] Typography follows hierarchy (xl/lg/sm, bold weights)
- [ ] Buttons use `Button` component with correct variants
- [ ] Forms use `FormInput`/`FormSelect` components
- [ ] Status indicators use `Badge` component
- [ ] Tables use `Table` component with pagination
- [ ] Cards use `Card` component
- [ ] Icons are Font Awesome classes (fa-solid fa-*)
- [ ] Hover states work correctly
- [ ] Focus states visible on inputs
- [ ] Loading states implemented
- [ ] Error states handled gracefully
- [ ] Mobile responsive (test on 320px, 768px, 1024px)
- [ ] Animations applied (fade-in)
- [ ] No console errors
- [ ] TypeScript compiles without errors

## 🐛 Common Issues to Fix

### Replace Custom CSS
**Before:**
```tsx
<div style={{ backgroundColor: '#28a745', padding: '10px' }}>
```
**After:**
```tsx
<div className="bg-green-700 p-3">
```

### Replace Inline Styles
**Before:**
```tsx
<button style={{ color: 'white', background: 'green' }}>Save</button>
```
**After:**
```tsx
<Button variant="primary" icon="fa-solid fa-save">Save</Button>
```

### Replace Custom Status Badges
**Before:**
```tsx
<span className="status-active">Active</span>
```
**After:**
```tsx
<Badge variant="green">Active</Badge>
```

### Replace Custom Tables
**Before:**
```tsx
<table className="custom-table">
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```
**After:**
```tsx
<Table
  title="Table Title"
  columns={columns}
  data={data}
  pagination={pagination}
/>
```

## 📊 Progress Tracking

### Overall Progress: 0/20 pages

**Priority 1 (Core Functionality):**
- [ ] Login (1/1)
- [ ] AdminDashboard (0/1)
- [ ] FarmerRegistration (0/1)
- [ ] FarmerList (0/1)

**Priority 2 (Main Features):**
- [ ] FarmerDetails (0/1)
- [ ] UserManagement (0/1)
- [ ] IDCardManagement (0/1)
- [ ] OperatorDashboard (0/1)
- [ ] DataEntryDashboard (0/1)

**Priority 3 (Supporting Features):**
- [ ] Reports (0/1)
- [ ] Settings (0/1)
- [ ] Profile (0/1)
- [ ] All other pages (0/8)

## 🎓 Learning Resources

- **Component Examples**: See `src/components/ui/ExampleDashboard.tsx`
- **Design System Guide**: See `UI_COMPONENTS_GUIDE.md`
- **Implementation Guide**: See `IMPLEMENTATION_GUIDE.md`
- **Tailwind Docs**: https://tailwindcss.com/docs
- **Font Awesome Icons**: https://fontawesome.com/icons

## 🚀 Tips for Fast Migration

1. **Start with high-traffic pages** (Login, Dashboards, Farmer List)
2. **Use find & replace** for common patterns:
   - `className="btn-primary"` → Use `<Button variant="primary">`
   - `className="status-badge"` → Use `<Badge>`
3. **Copy patterns** from `ExampleDashboard.tsx`
4. **Test incrementally** - don't migrate all pages at once
5. **Use TypeScript** to catch errors early
6. **Run dev server** and check console for warnings

## 📝 Notes

- **Do not** edit files in `frontend_backup/` or `.bak` files
- **Always** test mobile responsiveness
- **Keep** business logic in services, not components
- **Follow** the color palette strictly (no custom colors)
- **Use** semantic HTML (proper headings hierarchy)
- **Add** loading and error states to all data-fetching components

---

**Last Updated:** 2025-11-25
**Status:** Ready for implementation
**Estimated Time:** 5-7 days for complete migration
