# Color Scheme Reference - Operator Dashboard

## Primary Gradient (Background)
```
from-indigo-500 via-purple-500 to-pink-500
```

Visual: Indigo → Purple → Pink
Used on: Main page background

---

## Stats Cards
```
from-indigo-600 to-purple-600
```

Visual: Indigo → Purple
Used on: Stats cards (My Farmers, This Month, Pending Docs, Total Land)

Hover Effects:
- `hover:shadow-xl` - Enhanced shadow
- `hover:scale-105` - Slight zoom effect
- `transition-all` - Smooth animation

---

## Button Colors

### Primary Actions (Navigation)
- **All Farmers Button:** `bg-blue-600 hover:bg-blue-700`
- **Add Farmer Button:** `bg-green-600 hover:bg-green-700`
- **Logout Button:** `bg-red-600 hover:bg-red-700`

### View Toggles
- **Active:** `bg-blue-600 hover:bg-blue-700 text-white`
- **Inactive:** `bg-gray-200 hover:bg-gray-300 text-gray-700`

---

## Text & Backgrounds

### Headers & Titles
- **Page Title:** `text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white`
- **Section Title:** `text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900`
- **Subtitle:** `opacity-90 text-xs sm:text-sm md:text-base`

### Body Text
- **Default:** `text-gray-600`
- **Emphasized:** `text-gray-900`
- **Secondary:** `text-gray-500`

### Backgrounds
- **Main Content:** `bg-white`
- **Table Header:** `bg-gray-100`
- **Table Hover:** `hover:bg-gray-50`
- **Empty State:** `text-center`

---

## Status Badges

### Verified Status
```
bg-green-100 text-green-800
```

### Registered/Active Status
```
bg-blue-100 text-blue-800
```

### Pending Status
```
bg-yellow-100 text-yellow-800
```

### Inactive/Rejected
```
bg-red-100 text-red-800
```

---

## Interactive Elements

### Inputs & Forms
- **Border:** `border-2 border-gray-300`
- **Focus Border:** `focus:border-blue-500`
- **Focus Ring:** `focus:ring-2 focus:ring-blue-100`
- **Outline:** `focus:outline-none`

### Cards
- **Border:** `border border-gray-200`
- **Shadow:** `shadow-lg`
- **Rounded:** `rounded-lg` or `rounded-xl`
- **Hover:** `hover:shadow-lg hover:scale-105`

### Tables
- **Header Background:** `bg-gray-100`
- **Header Text:** `text-gray-700`
- **Divider:** `divide-y divide-gray-200`
- **Cell Padding:** `px-4 sm:px-6 py-3` or `py-4`

---

## Responsive Spacing

### Standard Padding
- **Mobile:** `p-4`
- **Tablet:** `sm:p-6`
- **Desktop:** `md:p-8`

### Grid Gaps
- **Mobile:** `gap-3`
- **Tablet/Desktop:** `sm:gap-4`

### Cell Padding
- **Horizontal:** `px-4 sm:px-6`
- **Vertical:** `py-3` (header) or `py-4` (rows)

---

## Responsive Text Sizes

### Headings
- **Page Title:** `text-2xl sm:text-3xl md:text-4xl lg:text-5xl`
- **Section Title:** `text-xl sm:text-2xl md:text-3xl`
- **Stats Numbers:** `text-2xl sm:text-3xl md:text-4xl`

### Body Text
- **Default:** `text-sm sm:text-base`
- **Small:** `text-xs`
- **Monospace (IDs):** `font-mono text-xs`

---

## Shadow Effects

### Light Shadow
```
shadow-sm
```

### Standard Shadow
```
shadow-lg
```

### Strong Shadow
```
shadow-2xl
```

### Hover Shadow
```
hover:shadow-xl
```

---

## Transitions & Animations

### Standard Transition
```
transition-all
```

Used with:
- Hover effects
- Active states
- Focus states

### Animations
- **Spinner:** `animate-spin` (w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full)
- **Scale:** `hover:scale-105` (grows 5% on hover)
- **Active Press:** `active:scale-95` (shrinks 5% when clicked)

---

## Accessibility Considerations

✅ **Color Contrast:** All text meets WCAG AA standards
✅ **Focus States:** All interactive elements have visible focus indicators
✅ **Semantic HTML:** Proper use of headings, labels, buttons
✅ **Responsive:** Works on all screen sizes
✅ **Motion:** Smooth transitions (not jarring)

---

## Implementation Notes

- All colors use Tailwind's built-in color palette
- Consistent gradient direction: `to-br` (top-left to bottom-right)
- Responsive design uses `sm:` and `md:` prefixes
- No custom colors (all from Tailwind defaults)
- Shadows use Tailwind's predefined levels
- Animations are CSS-based (no JavaScript)

---

## Quick Reference Commands

Replace these in your code:

| Element | Tailwind Class |
|---------|----------------|
| Main gradient | `bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500` |
| Card shadow | `shadow-2xl` |
| Hover scale | `hover:scale-105` |
| Focus ring | `focus:ring-2 focus:ring-blue-100` |
| Status badge | `inline-block px-3 py-1 text-xs font-semibold rounded-full` |
| Button hover | `hover:bg-blue-700` |
| Table divide | `divide-y divide-gray-200` |

