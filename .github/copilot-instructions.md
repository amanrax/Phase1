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



CEM (Chiefdom Empowerment Model) – Complete Copilot Instructions
For Backend, Frontend, Deployment, and Mobile Readiness
1. Project Overview
Goal: Deploy a mobile-first farmer management system (CEM) for Zambian smallholder farmers with production-ready backend, responsive frontend, and APK capability.

Current Status:

Backend: FastAPI + MongoDB Atlas + Celery + Redis ✓ (working locally)

Frontend: React + TypeScript + Vite + Tailwind CSS ✓ (working locally)

Infrastructure: New AWS account (free tier credits $135.57 remaining until 11/20/2026)

Deployment: Mobile APK is primary; web frontend is optional

Design System: Zambian green theme (#15803d) with Tailwind CSS

Team: Single full-stack developer using GitHub Codespaces, AWS, and GitHub Student pack

2. Directory Structure & Key Files
text

3. Database & Infrastructure
MongoDB
Current: MongoDB Atlas free tier (in-use)

Retention: Keep as-is; no migration needed for production

Collections: farmers, operators, admins, logs, system_logs, id_cards, supply_requests, documents and there may  be more

Redis
Current: AWS ElastiCache (limited free tier) or local Redis in docker-compose

Purpose: Celery broker + caching

Retention: For MVP, free ElastiCache or local Docker Redis is fine

AWS Services for Deployment
EC2 (t3.micro): Free tier; run Docker containers here

Secrets Manager: Store Mongo URI, Redis URL, JWT secrets, API keys

VPC + Security Groups: Control inbound/outbound traffic

CloudWatch Logs: Centralize container logs

4. Backend Patterns & Constraints
Async vs Sync Database Access
text
Request handlers (routes/):
  ✓ Use motor (async) via database.py
  
Celery tasks (tasks/):
  ✓ Use pymongo (sync) directly
  ✗ Do NOT use motor in tasks; it breaks task lifecycle
Key Services (Business Logic)
Farmer CRUD, status updates

 Token refresh, logout, password reset

 Structured logging to MongoDB

 ID card generation (sync, calls Celery task)
 Email/SMS stubs for alerts

Celery Tasks (background jobs)
Generate and store ID cards (uses GridFS)

 Aggregate reports asynchronously
 Periodic log cleanup (keep 7 days)

Config Expectations
MONGO_URI – MongoDB Atlas connection string (required)

REDIS_URL – Redis connection (e.g., redis://localhost:6379)

JWT_SECRET – Signing key for tokens (required)

VITE_API_BASE_URL – Frontend-facing API URL (e.g., http://localhost:8000)

LOG_LEVEL – Info, Debug, Error (default: Info)

ENVIRONMENT – local, staging, production

5. Frontend Design System (Non-Negotiable)
Color Palette
css
:root {
  /* Primary Zambia Green */
  --zam-green-700: #15803d;
  --zam-green-800: #166534;
  --zam-green-900: #14532d;
  
  /* Secondary Orange (alerts, warnings) */
  --zam-orange: #c2410c;
  
  /* Neutral */
  --bg-main: #f8fafc;
  --bg-card: #ffffff;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
}
Typography
Body Font: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif

Page Title: text-2xl font-bold text-gray-800

Section Header: text-lg font-bold text-gray-800

Label: text-xs font-bold text-gray-600 uppercase tracking-wider

Body: text-sm text-gray-600

Component Patterns
Buttons:

tsx
// Primary (green)
<button className="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition">
  Action
</button>

// Secondary (white outline)
<button className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg">
  Cancel
</button>
Form Inputs:

tsx
<input 
  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
  type="text"
/>
Cards:

tsx
<div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-200">
  {/* content */}
</div>
Stat Cards (Dashboard):

tsx
<div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-600 hover:shadow-md transition">
  <div className="flex justify-between">
    <div>
      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Farmers Registered</p>
      <h3 className="text-2xl font-bold text-gray-800 mt-1">1,240</h3>
    </div>
    <div className="bg-green-50 p-3 rounded-lg text-green-600">
      <i className="fa-solid fa-users text-xl"></i>
    </div>
  </div>
</div>
Tables:

tsx
<div className="bg-white rounded-xl shadow-sm overflow-hidden">
  <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
    <h3 className="font-bold text-lg">Farmers List</h3>
    <button className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg">
      <i className="fa-solid fa-plus mr-2"></i> Add Farmer
    </button>
  </div>
  <table className="w-full text-left text-sm text-gray-600">
    <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
      <tr>
        <th className="px-6 py-3">Name</th>
        <th className="px-6 py-3">Status</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-200">
      <tr className="hover:bg-green-50 transition">
        <td className="px-6 py-4">John Doe</td>
        <td className="px-6 py-4">
          <span className="bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded-full">
            Active
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
Status Badges:

Active: bg-green-100 text-green-800

Pending: bg-yellow-100 text-yellow-800

Rejected: bg-red-100 text-red-800

Icons
Use Font Awesome 6.4.0 (included via CDN)

Common: fa-solid fa-users, fa-solid fa-chart-line, fa-solid fa-gear, fa-solid fa-wheat-awn

6. Frontend Data Flow
text
Component
  ↓
  Hook (useState, useContext)
  ↓
  Service Layer (frontend/src/services/farmer.service.ts)
  ↓
  Axios (frontend/src/utils/axios.ts)
  ↓
  Backend API
  ↓
  Backend Service (business logic)
  ↓
  MongoDB (motor async)
Key Rules:

Never call axios directly in components; use *.service.ts files

Auth Store (Zustand) syncs tokens to localStorage; axios interceptor refreshes on 401

Refresh flow: Attempt one POST /auth/refresh, then logout on failure

7. Development Workflow
Full Stack (Local)
bash
docker-compose up --build
# Launches: backend (8000), frontend (5173), mongo, redis, celery worker
Backend Only
bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
Frontend Only
bash
cd frontend
npm install
npm run dev
Run Celery Worker
bash
cd backend
celery -A app.tasks.celery_app worker --loglevel=info
8. Common Task Instructions for Copilot
A. Add a New Backend Endpoint
Instruction to Copilot:

text
Create a new REST endpoint GET /api/farmers/{farmer_id}/stats

Requirements:
- Route: backend/app/routes/farmers.py
- Service: backend/app/services/farmer_service.py (new or add to existing)
- Database: Use motor async client from backend/app/database.py
- Auth: Require JWT; extract user from request (admin or operator role)
- Logging: Log the request start, response time, and any errors using backend/app/services/logging_service.py
- Response schema: Use Pydantic model FarmerStatsResponse in backend/app/schemas/
- Error handling: Return 404 if farmer not found, 403 if unauthorized, 500 if DB error
- No hardcoded values; all config from backend/app/config.py

Do NOT change existing auth flow, database client, or logging patterns.
B. Add a New Frontend Page
Instruction to Copilot:

text
Create a new page "Reports" for admins to view aggregated farmer stats.

Requirements:
- File: frontend/src/pages/Reports.tsx
- Service: frontend/src/services/reports.service.ts (fetch /api/reports)
- State: Use Zustand store for report filters (role, date range)
- Design: Follow the dashboard design system:
  - Stat cards with green borders (border-l-4 border-green-600)
  - Table with pagination
  - Search/filter inputs using the form input pattern
  - Loading spinner while fetching
  - Error notification using notification service
- Icons: Font Awesome (fa-solid fa-chart-bar, fa-solid fa-download)
- Responsive: mobile-first (sm:, md:, lg: prefixes)
- Error handling: Show error toast if API fails; show empty state if no data
- TypeScript strict: No 'as any'

Do NOT hardcode any API URLs; use service layer.
Do NOT change existing auth flow or axios interceptor.
C. Add Error Handling & Notifications
Instruction to Copilot:

text
Audit and fix error handling across all pages:

Requirements:
- All API calls must have try-catch
- On error:
  - Log to console (dev) and backend (prod)
  - Show user-friendly toast/notification
  - Do NOT expose internal error messages to users
- Notification service: Use a centralized toast/notification component
- Types: 'success', 'error', 'warning', 'info'
- Duration: 3–5 seconds auto-dismiss
- Styling: Match design system (green for success, red for error, yellow for warning)
- Examples:
  - 401 → "Session expired. Please log in again."
  - 404 → "Resource not found."
  - 500 → "Something went wrong. Please try again later."

Do NOT change component logic or business rules; only add error handling UI.
D. Prepare for Mobile (PWA + Capacitor)
Instruction to Copilot:

text
Make the frontend ready for mobile deployment:

Requirements:
1. Manifest & PWA:
   - Create public/manifest.json
   - App name: "CEM"
   - Icons: 192x192, 512x512 PNG (use your logo)
   - Display: standalone
   - Theme color: #15803d
   - Background color: #ffffff

2. Responsive Design:
   - All pages must work on mobile (375px), tablet (768px), desktop (1920px)
   - Use mobile-first approach (base + sm: md: lg: modifiers)
   - Sidebar → hamburger menu on mobile
   - Forms: Full width on mobile, 2-3 cols on desktop

3. Performance:
   - Lazy load images
   - Code split pages
   - Debounce search/filter inputs

4. Service Worker:
   - Basic caching for offline functionality (shell, static assets)

5. Build Variants:
   - Development: VITE_API_BASE_URL=http://localhost:8000
   - Production APK: VITE_API_BASE_URL=https://api.cem.yourdomain.com (or EC2 IP)

Do NOT change business logic or API contracts.
Do NOT modify auth flow; PWA reuses existing Zustand store.
E. Logging & Monitoring
Instruction to Copilot:

text
Implement structured logging across backend:

Requirements:
1. Logging Service (backend/app/services/logging_service.py):
   - Log to MongoDB collection system_logs
   - Schema: {timestamp, level, module, endpoint, user_id, role, action, details, ip_address, response_time_ms}
   - Async writes (don't block requests)

2. Log All Endpoints:
   - Log start: endpoint, user_id, role
   - Log end: response code, response time
   - Log errors: exception type, traceback

3. Cleanup:
   - Celery task: Keep logs for 7 days; delete older
   - Run daily at 2 AM UTC

4. Viewing Logs:
   - Add endpoint GET /api/admin/logs (admin only)
   - Filter by: date range, level, module, endpoint
   - Return paginated results

5. Frontend (optional):
   - Add page: Admin → System Logs
   - Table with log entries, filterable

Do NOT log sensitive data (passwords, tokens, PII).
Do NOT slow down requests with sync logging.
F. Deployment to AWS EC2
Instruction to Copilot:

text
Prepare backend for AWS EC2 deployment:

Requirements:
1. Environment:
   - Create .env.production with all secrets (use AWS Secrets Manager)
   - No hardcoded values
   - Required vars: MONGO_URI, REDIS_URL, JWT_SECRET, ENVIRONMENT=production

2. Dockerfile:
   - Multi-stage: builder + runtime
   - Base: python:3.11-slim
   - Install deps, copy app, expose 8000
   - CMD: uvicorn app.main:app --host 0.0.0.0 --port 8000

3. docker-compose.yml (production):
   - backend service: pull from ECR or local build
   - environment: inject from .env.production
   - volumes: /data for logs/certs
   - restart: always
   - health check: curl http://localhost:8000/health

4. EC2 Setup Script:
   - Launch t3.micro Ubuntu 22.04
   - Install Docker + Docker Compose
   - Clone repo, set .env.production
   - Run docker-compose up -d
   - Set up NGINX reverse proxy (port 80 → 8000)
   - Enable SSL (Let's Encrypt/Certbot)

5. Secrets Manager:
   - Store MONGO_URI, REDIS_URL, JWT_SECRET in AWS Secrets Manager
   - Fetch at startup or via environment variable

Do NOT commit .env.production to Git.
Do NOT use hardcoded localhost URLs in production.
9. Current Issues & Fixes
Issue 1: Env Variable Mismatch
Problem: docker-compose.yml sets VITE_API_URL but frontend expects VITE_API_BASE_URL

Fix: Standardize on VITE_API_BASE_URL everywhere; update docker-compose.yml and .env files

Issue 2: Hard-Coded Remote URLs
Problem: Fallback URLs in frontend/src/utils/axios.ts and vite.config.ts

Fix: Remove fallbacks; rely on env variables only. Gate console.log with import.meta.env.DEV

Issue 3: Backup Files
Problem: Stale backups (frontend_backup/, *.bak) clutter repo

Fix: Delete old backups; keep only active code

Issue 4: Inconsistent UI
Problem: Some components don't follow the design system

Fix: Audit all components; update to match green theme, Tailwind classes, spacing

10. Testing & Quality Checklist
Before deploying to AWS, verify:

 Backend starts without errors: docker-compose up --build

 Frontend loads at http://localhost:5173

 Login works for admin/operator/farmer roles

 All REST endpoints respond (use curl or Postman)

 Celery worker starts and processes tasks

 Logs are being stored in MongoDB

 API errors show user-friendly messages (no raw exceptions)

 Forms validate inputs client-side and show errors

 Tables paginate and filter correctly

 Mobile layout is responsive (test in Chrome DevTools)

 Auth refresh works (test by manually expiring token)

 Rate limiting is in place (if needed)

11. Deployment Steps (Once Ready)
Set up AWS account (✓ Done)

Create EC2 instance (t3.micro, free tier)

Store secrets in AWS Secrets Manager

Push backend to ECR (if using ECS later)

SSH into EC2, install Docker, clone repo

Set .env.production with AWS secrets

Run docker-compose up -d

Point mobile APK to backend URL

Monitor logs via CloudWatch or docker logs


# Rules
1. Do NOT change core business logic
2. Do NOT add hardcoded values
3. Do NOT use 'as any' in TypeScript
4. Do NOT modify auth flow without updating both frontend/src/utils/axios.ts and frontend/src/store/authStore.ts
5. Always use service layer (frontend/src/services/*.ts) for API calls; never direct axios in components
6. Always log operations using backend/app/services/logging_service.py
7. Preserve motor vs pymongo split for async/sync database access
8. Follow design system patterns for all UI components
13. Success Criteria







