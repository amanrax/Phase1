# UI Components Library - Design System Implementation

## Overview
Complete set of reusable UI components following the ZIAMIS Pro design system specifications.

## Components Created

### 1. Form Components

#### `FormInput`
Text input with label and validation styling.
```tsx
<FormInput
  label="Field Name"
  value={value}
  onChange={(val) => setValue(val)}
  placeholder="Enter value"
  required
/>
```

#### `FormSelect`
Dropdown select with consistent styling.
```tsx
<FormSelect
  label="Select Option"
  value={value}
  onChange={(val) => setValue(val)}
  options={[
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' }
  ]}
  required
/>
```

### 2. Button Components

#### `Button`
Primary, secondary, and danger button variants with icon support.
```tsx
<Button 
  variant="primary" 
  icon="fa-solid fa-save"
  onClick={handleSave}
>
  Save Changes
</Button>
```

Variants: `primary`, `secondary`, `danger`

### 3. Data Display Components

#### `StatCard`
Dashboard statistic cards with border colors and trend indicators.
```tsx
<StatCard
  label="Total Farmers"
  value="1,240"
  icon="fa-solid fa-users"
  borderColor="green"
  trend="+12% this month"
/>
```

Border colors: `green`, `orange`, `blue`, `purple`

#### `Card`
Generic container card with consistent styling.
```tsx
<Card>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>
```

#### `Badge`
Status badges with color variants.
```tsx
<Badge variant="green">Verified</Badge>
<Badge variant="yellow">Pending</Badge>
<Badge variant="red">Rejected</Badge>
```

#### `Table`
Data table with pagination, toolbar, and custom cell rendering.
```tsx
<Table
  title="Farmers List"
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status', render: (val) => <Badge>{val}</Badge> }
  ]}
  data={farmers}
  onAddClick={() => navigate('/add-farmer')}
  addButtonLabel="Add Farmer"
  pagination={{
    currentPage: 1,
    totalPages: 10,
    totalItems: 100,
    itemsPerPage: 10,
    onPageChange: (page) => setPage(page)
  }}
/>
```

### 4. Navigation Components

#### `WizardSteps`
Multi-step form progress indicator.
```tsx
<WizardSteps
  steps={[
    { number: 1, label: 'Basic Info', status: 'completed' },
    { number: 2, label: 'Contact', status: 'active' },
    { number: 3, label: 'Review', status: 'pending' }
  ]}
/>
```

#### `Sidebar`
Fixed left sidebar navigation with role-based filtering.
```tsx
<Sidebar
  navGroups={[
    {
      title: 'Main',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-line' },
        { path: '/farmers', label: 'Farmers', icon: 'fa-solid fa-users' }
      ]
    },
    {
      title: 'Admin',
      items: [
        { path: '/users', label: 'Users', icon: 'fa-solid fa-user-gear' }
      ],
      roles: ['Admin', 'Super Admin']
    }
  ]}
/>
```

#### `TopBar`
Fixed top header with search and notifications.
```tsx
<TopBar
  title="Dashboard"
  showSearch
  onSearchChange={(val) => setSearch(val)}
>
  <button>Custom Action</button>
</TopBar>
```

#### `DashboardLayout`
Complete layout wrapper with sidebar, topbar, and content area.
```tsx
<DashboardLayout
  navGroups={navConfig}
  pageTitle="Dashboard"
  showSearch
  onSearchChange={handleSearch}
>
  <div>Your page content here</div>
</DashboardLayout>
```

## Design System Compliance

### Color Palette
- **Primary Green**: `bg-green-700` / `text-green-700` / `border-green-600`
- **Dark Green**: `bg-green-900` / `text-green-900`
- **Orange (Copper)**: `bg-orange-600` / `text-orange-600` / `border-orange-500`
- **Backgrounds**: `bg-slate-50` (page), `bg-white` (cards)

### Typography
- **Page titles**: `text-xl font-bold text-gray-800` or `text-2xl`
- **Section headers**: `text-lg font-bold text-gray-800`
- **Subsections**: `text-sm font-bold text-gray-700 uppercase tracking-wider`
- **Labels**: `text-xs font-bold text-gray-600 uppercase`
- **Body text**: `text-sm text-gray-600` or `text-gray-700`

### Spacing & Layout
- Card padding: `p-6`
- Card borders: `rounded-xl`
- Shadows: `shadow-sm` (default), `hover:shadow-md` (hover)
- Transitions: `transition` for smooth state changes
- Gaps: `gap-4` (1rem), `gap-6` (1.5rem)

### Interactive Elements
- **Hover states**: All interactive elements have hover effects
- **Focus states**: Form inputs use `focus:ring-2 focus:ring-green-500`
- **Disabled states**: `opacity-50 cursor-not-allowed`
- **Active states**: Navigation items show green background + orange border

## Usage Guidelines

### Importing Components
```tsx
import { Button, FormInput, StatCard, Table, DashboardLayout } from '../components/ui';
```

### Consistency Rules
1. ✅ Always use the UI components instead of custom implementations
2. ✅ Follow the color palette strictly (no custom colors)
3. ✅ Use Tailwind utility classes for spacing and layout
4. ✅ Include Font Awesome icons where specified
5. ✅ Apply the fade-in animation to page content
6. ✅ Maintain responsive behavior (mobile-first)

### Common Patterns

#### Dashboard Page
```tsx
const Dashboard = () => {
  return (
    <DashboardLayout navGroups={NAV_CONFIG} pageTitle="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Farmers" value="1,240" icon="fa-solid fa-users" borderColor="green" />
        <StatCard label="Pending" value="42" icon="fa-solid fa-clock" borderColor="orange" />
        <StatCard label="This Month" value="156" icon="fa-solid fa-calendar" borderColor="blue" />
        <StatCard label="Active Users" value="24" icon="fa-solid fa-user-check" borderColor="purple" />
      </div>
      
      <div className="mt-6">
        <Table
          title="Recent Registrations"
          columns={columns}
          data={data}
          pagination={pagination}
        />
      </div>
    </DashboardLayout>
  );
};
```

#### Form Page
```tsx
const AddFarmer = () => {
  return (
    <DashboardLayout navGroups={NAV_CONFIG} pageTitle="Add Farmer">
      <Card>
        <WizardSteps steps={wizardSteps} />
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="First Name"
              value={formData.firstName}
              onChange={(val) => setFormData({...formData, firstName: val})}
              required
            />
            <FormInput
              label="Last Name"
              value={formData.lastName}
              onChange={(val) => setFormData({...formData, lastName: val})}
              required
            />
          </div>
          
          <div className="mt-6 flex justify-end gap-4">
            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button variant="primary" type="submit" icon="fa-solid fa-save">
              Save Farmer
            </Button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
};
```

## Next Steps

To integrate these components into your pages:

1. Update existing pages to use `DashboardLayout` wrapper
2. Replace custom form components with `FormInput` and `FormSelect`
3. Update dashboard stats to use `StatCard` components
4. Replace custom tables with the `Table` component
5. Use `Badge` for all status indicators
6. Apply consistent button styling with the `Button` component

## File Locations

All components are located in:
```
frontend/src/components/ui/
├── Badge.tsx
├── Button.tsx
├── Card.tsx
├── DashboardLayout.tsx
├── FormInput.tsx
├── FormSelect.tsx
├── Sidebar.tsx
├── StatCard.tsx
├── Table.tsx
├── TopBar.tsx
├── WizardSteps.tsx
└── index.ts (exports all components)
```

## Design System Assets

- **Font Awesome 6.4.0**: Already included via CDN in `index.html`
- **Tailwind CSS v4**: Configured with design system colors in `tailwind.config.js`
- **CSS Variables**: Defined in `index.css` for theme colors
- **Custom Animations**: Fade-in animation available globally
