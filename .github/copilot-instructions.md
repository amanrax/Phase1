Purpose
Concise, actionable guidance for AI coding agents working in this repository (frontend + backend) with strict UI/UX consistency requirements.

Big Picture
Backend: FastAPI app in backend/app (entry backend/app/main.py). MongoDB is the primary datastore; request handlers use the async motor client (backend/app/database.py). Background processing uses Celery + Redis with worker tasks under backend/app/tasks/ (worker tasks intentionally use a sync pymongo client).

Frontend: React + TypeScript + Vite (entry frontend/src/main.tsx). Network calls go through frontend/src/utils/axios.ts and the domain service layer in frontend/src/services/* (prefer these services over ad-hoc axios calls in components).

Orchestration: docker-compose.yml runs backend, Celery worker, MongoDB and Redis for full-stack development.

UI/UX Design System (Non-Negotiable)
All frontend components must adhere to the following design patterns extracted from the reference files:

Color Palette & Branding
css
:root {
  --zam-green: #15803d;      /* Primary action color */
  --zam-dark: #14532d;       /* Dark green accent */
  --zam-copper: #c2410c;     /* Secondary/alert color (orange) */
  --bg-main: #f8fafc;        /* Page background */
  --bg-card: #ffffff;        /* Card/container background */
}
Usage Rules:

Primary buttons: bg-green-700 hover:bg-green-800 text-white

Secondary actions: text-green-600 hover:text-green-700

Alerts/notifications: bg-orange-600 or border-orange-500

Status badges: Green (verified/active), Yellow (pending), Red (rejected/inactive)

Backgrounds: Body bg-slate-50 or bg-gray-50, cards bg-white

Typography
css
body { 
  font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; 
}
Heading Hierarchy:

Page titles: text-xl font-bold text-gray-800 or text-2xl font-bold text-gray-800

Section headers: text-lg font-bold text-gray-800

Subsections: text-sm font-bold text-gray-700 uppercase tracking-wider

Labels: text-xs font-bold text-gray-600 uppercase

Body text: text-sm text-gray-600 or text-gray-700

Layout Structure
Sidebar Navigation (Fixed Left):

css
/* Width: 16rem (w-64) */
/* Background: bg-gray-900 */
/* Logo area: bg-green-800 h-16 */
Navigation Items:

css
.nav-item { 
  @apply flex items-center px-4 py-3 text-gray-300 
  hover:bg-green-900 hover:text-white transition-all cursor-pointer 
  border-l-4 border-transparent; 
}
.nav-item.active { 
  @apply bg-green-900 text-white border-orange-500; 
}
Group Navigation by Sections:

css
.nav-group-title { 
  @apply px-4 mt-6 mb-2 text-xs font-bold 
  text-gray-500 uppercase tracking-wider; 
}
Top Header Bar:

Height: h-16

Background: bg-white shadow-sm

Contains: page title (left), search bar + notifications (right)

Search input: bg-gray-100 rounded-full focus:bg-white focus:ring-2 focus:ring-green-500

Form Components
Input Fields:

xml
<input 
  class="w-full p-3 border border-gray-300 rounded-lg mt-1 
  focus:ring-2 focus:ring-green-500 outline-none"
  type="text"
/>
Select Dropdowns:

xml
<select 
  class="w-full p-3 border border-gray-300 rounded-lg mt-1 
  focus:ring-2 focus:ring-green-500 outline-none"
>
  <option>...</option>
</select>
Buttons:

Primary: bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded-lg transition shadow-lg

Secondary: bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg

Icon buttons: text-gray-500 hover:text-gray-700 p-2

Labels:

xml
<label class="text-xs font-bold text-gray-600 uppercase">Field Name</label>
Cards & Containers
Standard Card:

xml
<div class="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition">
  <!-- content -->
</div>
Stat Cards (Dashboard):

xml
<div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-600 hover:shadow-md transition">
  <div class="flex justify-between">
    <div>
      <p class="text-xs text-gray-500 uppercase font-bold tracking-wider">Label</p>
      <h3 class="text-2xl font-bold text-gray-800 mt-1">1,240</h3>
    </div>
    <div class="bg-green-50 p-3 rounded-lg text-green-600">
      <i class="fa-solid fa-users text-xl"></i>
    </div>
  </div>
</div>
Border colors for stat cards:

Green: border-green-600 (primary metrics)

Orange: border-orange-500 (alerts/pending)

Blue: border-blue-600 (secondary info)

Purple: border-purple-600 (user/admin metrics)

Tables
Structure:

xml
<div class="bg-white rounded-xl shadow-sm overflow-hidden">
  <!-- Toolbar -->
  <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
    <h3 class="font-bold text-lg">Table Title</h3>
    <button class="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg">
      <i class="fa-solid fa-plus mr-2"></i> Add Item
    </button>
  </div>
  
  <!-- Table -->
  <table class="w-full text-left text-sm text-gray-600">
    <thead class="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
      <tr>
        <th class="px-6 py-3">Column</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-200">
      <tr class="hover:bg-green-50 transition">
        <td class="px-6 py-4">Data</td>
      </tr>
    </tbody>
  </table>
  
  <!-- Pagination -->
  <div class="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between">
    <span>Showing 1-10 of 1,240</span>
    <div class="flex gap-1">
      <button class="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100">Prev</button>
      <button class="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100">Next</button>
    </div>
  </div>
</div>
Status Badges
css
.badge { @apply px-2 py-1 text-xs font-semibold rounded-full; }
.badge-green { @apply bg-green-100 text-green-800; }
.badge-yellow { @apply bg-yellow-100 text-yellow-800; }
.badge-red { @apply bg-red-100 text-red-800; }
Form Wizard (Multi-Step Forms)
Step Indicators:

css
.wizard-step { 
  @apply flex items-center justify-center w-8 h-8 
  rounded-full border-2 font-bold text-sm transition-colors; 
}
.wizard-active { @apply bg-green-700 text-white border-green-700; }
.wizard-done { @apply bg-green-900 text-white border-green-900; }
.wizard-pending { @apply text-gray-400 border-gray-300; }
Structure:

xml
<div class="flex justify-between items-center mb-8 px-8">
  <div class="flex flex-col items-center">
    <div class="wizard-step wizard-active">1</div>
    <span class="text-xs mt-2 font-bold text-green-800">Step Name</span>
  </div>
  <div class="h-1 bg-gray-300 flex-1 mx-2 mt-[-20px]"></div>
  <div class="flex flex-col items-center">
    <div class="wizard-step wizard-pending">2</div>
    <span class="text-xs mt-2 text-gray-500">Next Step</span>
  </div>
</div>
Animations
Fade In (Page Transitions):

css
.fade-in { animation: fadeIn 0.4s ease-out forwards; }
@keyframes fadeIn { 
  from { opacity: 0; transform: translateY(10px); } 
  to { opacity: 1; transform: translateY(0); } 
}
Apply to views: Add fade-in class to main content sections.

Custom Scrollbar
css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
Icons
Font Awesome 6.4.0: Include via CDN:

xml
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
Common Icons:

Users: fa-solid fa-users

Add user: fa-solid fa-user-plus

Dashboard: fa-solid fa-chart-line

Settings: fa-solid fa-gear

Logout: fa-solid fa-right-from-bracket

Save/Submit: fa-solid fa-check

Agriculture: fa-solid fa-wheat-awn

Login Screen
Structure:

xml
<div class="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center 
  bg-[url('...')] bg-cover bg-center">
  <div class="absolute inset-0 bg-green-900/80 backdrop-blur-sm"></div>
  <div class="relative bg-white p-8 rounded-2xl shadow-2xl w-96 fade-in">
    <div class="text-center mb-8">
      <i class="fa-solid fa-wheat-awn text-5xl text-green-700 mb-2"></i>
      <h1 class="text-2xl font-bold text-gray-800">ZIAMIS Pro</h1>
      <p class="text-gray-500 text-sm">Ministry of Agriculture</p>
    </div>
    <!-- Login form -->
  </div>
</div>
React Component Implementation Rules
Use Tailwind CSS Classes
Never write inline styles or custom CSS files unless creating global animations

All styling must use Tailwind utility classes matching the patterns above

Component Structure
tsx
// Example: StatCard.tsx
interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  borderColor: 'green' | 'orange' | 'blue' | 'purple';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, value, icon, borderColor, trend 
}) => {
  const borderClass = `border-${borderColor}-600`;
  const bgClass = `bg-${borderColor}-50`;
  const textClass = `text-${borderColor}-600`;
  
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${borderClass} hover:shadow-md transition`}>
      <div className="flex justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{label}</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        </div>
        <div className={`${bgClass} p-3 rounded-lg ${textClass}`}>
          <i className={`${icon} text-xl`}></i>
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-xs text-green-600 font-semibold">
          <i className="fa-solid fa-arrow-trend-up mr-1"></i> {trend}
        </div>
      )}
    </div>
  );
};
Form Components
tsx
// Example: FormInput.tsx
interface FormInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  label, type = 'text', value, onChange, placeholder, required
}) => {
  return (
    <div>
      <label className="text-xs font-bold text-gray-600 uppercase">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
      />
    </div>
  );
};
Button Components
tsx
// Example: Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  icon,
  children,
  onClick,
  type = 'button',
  disabled
}) => {
  const baseClass = "font-bold py-3 px-4 rounded-lg transition shadow-lg";
  const variantClass = {
    primary: "bg-green-700 hover:bg-green-800 text-white",
    secondary: "bg-white border border-gray-300 hover:bg-gray-100 text-gray-700",
    danger: "bg-red-600 hover:bg-red-700 text-white"
  }[variant];
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon && <i className={`${icon} mr-2`}></i>}
      {children}
    </button>
  );
};
Data Flow (Short)
UI → frontend/src/services/* → frontend/src/utils/axios.ts → backend/app/routes/* → backend/app/services/* → backend/app/database.py → MongoDB

Background work: routes/services enqueue Celery tasks (backend/app/tasks/*) → worker reads/writes via pymongo

Key Files & Examples
backend/app/config.py — pydantic-backed env config; missing fields will raise on startup

backend/app/database.py — async motor client used by request handlers

backend/app/tasks/id_card_task.py — canonical Celery task; uses pymongo (sync)

frontend/src/utils/axios.ts — central axios instance; implements token attach + single refresh then logout flow

frontend/src/store/authStore.ts — Zustand store that mirrors tokens to localStorage

Project-Specific Patterns & Constraints
Backend
Keep the motor (async) vs pymongo (sync) split. Do not replace pymongo in Celery tasks with motor without re-evaluating worker lifecycle

Keep routes thin: move logic into backend/app/services/* to promote reuse and easier testing

Frontend
Auth flow: Axios interceptor attempts exactly one refresh (POST /auth/refresh) and then logs out on failure — update both frontend/src/utils/axios.ts and frontend/src/store/authStore.ts together if changing this

Strict TypeScript: tsconfig.json uses strict: true; avoid as any and add/adjust types in services rather than components where possible

UI Consistency: All new components must follow the design system patterns above. Do not deviate from color scheme, spacing, typography, or component structure

Developer Workflows & Useful Commands
Full stack (recommended):

bash
docker-compose up --build
Backend only (local dev):

bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
Frontend only:

bash
cd frontend
npm install
npm run dev
Run Celery worker manually (backend venv):

bash
cd backend
celery -A app.tasks.celery_app worker --loglevel=info
Seeds & Helpers
backend/scripts/ contains utility scripts (e.g. seed_admin.py, create_test_users.py, seed_geo_from_csv.py) for seeding and repairing data.

Common Issues to Watch For
Backend
Env mismatch: docker-compose.yml sets VITE_API_URL while frontend expects VITE_API_BASE_URL (frontend/src/utils/axios.ts). Prefer setting VITE_API_BASE_URL=http://host.docker.internal:8000 or http://localhost:8000 in docker-compose.yml

Backup files (e.g., .bak, frontend_backup/) are present — avoid editing them; consider removing stale backups with project maintainers

Frontend
Hard-coded remote URLs and console.log calls in vite.config.ts and frontend/src/utils/axios.ts — gate logs with import.meta.env.DEV and replace remote fallbacks with env-driven defaults

Inconsistent UI: Frequently check that components match the design system. Use component libraries/shared components to avoid drift

Where to Add Changes (Practical Rules)
Backend
New REST endpoint: add under backend/app/routes/ and implement business logic in backend/app/services/

New DB helper: add to backend/app/services/* and use backend/app/database.py for async access

New background job: add a Celery task under backend/app/tasks/ and use pymongo inside the task to match existing worker patterns

Frontend
New page/view: Create under frontend/src/pages/ or frontend/src/components/

New reusable UI component: Create under frontend/src/components/ui/ following the design system patterns above

New service: Add to frontend/src/services/* (e.g., farmer.service.ts, auth.service.ts)

Global styles: Add animations or scrollbar customizations to frontend/src/index.css (use Tailwind @layer directives)

Tips for AI Agents (Concise)
Read backend/app/config.py early — many env fields are required

Preserve async vs sync DB client boundaries; changing them is non-trivial

Update axios + auth store together when touching auth flows

Prefer modifying/adding services rather than spreading axios calls across components

Always reference the design system above before creating new UI components

Use Font Awesome icons consistently across the project

Test responsive behavior (mobile, tablet, desktop) when adding new layouts

Keep form wizards consistent with the step indicator pattern shown above

Reference Files Note
The attached files (cropdetials-1.html, ZFMS-1.txt, example.html) are reference only and not part of the project codebase. Extract design patterns, color schemes, component structures, and UX flows from these files, then implement them using React + TypeScript + Tailwind CSS in your components.