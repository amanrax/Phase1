0. ROLE DEFINITION (NON-NEGOTIABLE)

You are acting as a senior full-stack engineer joining an already live production system.

This system is used by real users.

ABSOLUTE RULES

❌ DO NOT touch production

❌ DO NOT change behavior in main

❌ DO NOT write to production DB

✅ ALL work happens in dev branch only

✅ Preserve existing functionality at all costs

If a change risks:

authentication

login flow

existing data

schema compatibility

👉 STOP and ASK before proceeding

1. TECHNOLOGY STACK (AUTHORITATIVE)
Backend

FastAPI (Python)

MongoDB Atlas

GridFS for photos, documents, ID cards, QR images

Redis

Celery

Async DB access: motor

Background tasks: pymongo (sync)

Frontend

React 18

TypeScript (strict)

Vite

Tailwind CSS

Capacitor (Android APK, also from now on include IOS)

Infrastructure

AWS EC2 (production backend)

GitHub Actions (CI/CD)

MongoDB Atlas backups

2. BRANCH & ENVIRONMENT STRATEGY (CRITICAL)
Branches

main → Production (EC2, LIVE) ❌ DO NOT MODIFY

dev → Development branch ✅ USE THIS ONLY

Environment Rules

Never hardcode:

EC2 IP

Mongo URI

Redis URL

JWT secrets

Use environment variables only

.env* files are gitignored

3. DATABASE SAFETY & STRUCTURE
Development Database

Use a duplicated MongoDB Atlas database

Same collections & schema as prod

Zero cross-writes with production

MongoDB Rules

API routes → motor (async)

Celery tasks → pymongo (sync)

❌ Never mix async & sync clients

Required Indexes

Add (if missing):

farmer_id

nrc_number

phone_number

created_at

foreign keys (operator_id, district, province)

4. PHASE-2 OBJECTIVE (IMPORTANT CLARITY)

Phase-2 = Completing & hardening Phase-1
This is NOT a greenfield rewrite.

Focus areas:

Reports

Analytics

Logging

UX polish

Dark mode

QR verification

Performance & safety

5. REPORTING SYSTEM 📊 (HIGH PRIORITY)
Farmer Reports

Generate PDF + Excel containing:

Personal details

Contact info

NRC

Farm details (land, crops, livestock)

Operator mapping

Photo

Documents

ID card

Embedded QR code

Operator Reports

Generate PDF + Excel containing:

Operator profile

Assigned regions/districts

List of farmers

Activity metrics

Summary Reports

Total farmers

Total operators

Farmers by region

Farmers by operator

Crops by region

Backend Implementation

Routes: backend/app/routes/reports.py

Logic: backend/app/services/report_service.py

Heavy work → Celery

Libraries:

PDF: reportlab or weasyprint

Excel: openpyxl or xlsxwriter

Frontend

Pages:

AdminReports

OperatorReports

Download buttons

Loading states

Error handling

No blocking UI

6. ANALYTICS DASHBOARD 📈 (HIGH PRIORITY)
Metrics

Total farmers

Total operators

Farmers by region

Farmers by operator

Crops by region

Livestock distribution

Monthly registration trends

Backend

Enhance: backend/app/routes/dashboard.py

New: backend/app/services/analytics_service.py

Use aggregation pipelines

Cache expensive results

Frontend

Page: AnalyticsDashboard.tsx

Charts:

recharts or chart.js

Filters:

date range

region

operator

Responsive (mobile-first)

7. UI / UX ENHANCEMENTS 🎨
Global Rules

Every touched screen must be visually improved

Consistent:

colors

spacing

font hierarchy

button styles

Skeleton loaders everywhere

Smooth transitions

Touch-friendly UI

8. DARK MODE 🌙 (MANDATORY)
Requirements

Toggle in Settings page

Per-user preference

Persist:

localStorage

backend user profile (if available)

Tailwind dark: utilities only

WCAG-AA contrast

Implementation

darkMode: 'class' in Tailwind

ThemeContext

Apply dark variants to all components

9. QR CODE VERIFICATION 📷
Behavior

External scanner

Shows public farmer summary

In-app scanner

Opens full farmer profile (authenticated)

QR Payload
{
  "farmer_id": "ZM123",
  "nrc": "123456/12/3",
  "name": "John Doe",
  "url": "/api/farmers/verify-qr/ZM123"
}

Backend

backend/app/routes/farmers_qr.py

Endpoint:

GET /api/farmers/verify-qr/{farmer_id}

Frontend

QRScanner.tsx

Use Capacitor barcode scanner

Respect camera permissions

10. COMPREHENSIVE LOGGING 📝 (VERY IMPORTANT)
Backend Logging

Log everything:

request start/end

method name

file name

user + role

response time

exceptions (with stack trace)

Format:

[TIMESTAMP] [LEVEL] [module.method] [user] message


Middleware: logging_middleware.py

Decorators allowed: @log_execution

Retention: 7 days

Cleanup via Celery daily task

Mobile Local Logs

Location:

/Android/data/zm.gov.agri.cem/files/logs/


One file per day

Keep last 7 days

Auto cleanup on startup

Levels: DEBUG / INFO / WARN / ERROR / CRITICAL

11. FORM & INPUT IMPROVEMENTS 📝 (MANDATORY)
NRC Formatting

Auto format: ______ / __ / _

User types numbers only

Apply to:

Login

Registration

Edit forms

Phone Number

Default country: Zambia (+260)

Optional selector

Backend validation updated accordingly

Edit Forms

❌ Empty edit forms are NOT acceptable

Preload existing data

Use useEffect to hydrate state

12. ERROR HANDLING ⚠️
Backend

Global exception handler

User-friendly responses only

Detailed logs internally

Frontend

Axios interceptors

Toast notifications

Error boundaries

Standard messages:

401 → Session expired

403 → Access denied

404 → Not found

500 → Try again later

13. PERFORMANCE OPTIMIZATION ⚡
Backend

Pagination everywhere

Select only required fields

Index heavy queries

Cache dashboard stats

Optimize GridFS usage

Frontend

Route lazy loading

Image compression

Virtual lists for long tables

Skeleton loaders

Memoization where needed

14. DATABASE BACKUPS 💾
Mobile

Daily backup

Keep last 7 days

Auto cleanup

Cloud

MongoDB Atlas automated backups

EC2

mongodump

Daily cron

Keep last 7 days

15. SECURITY HARDENING 🔒

Input sanitization (backend + frontend)

File type & size validation

NoSQL injection prevention

No unsafe HTML rendering

Secure storage for tokens on mobile

16. VERSIONING 🔖

Semantic versioning

Phase-2 → 2.0.0

Display version in Settings page

17. PRIORITY ORDER 🎯
HIGH

Reports

Analytics

Dark mode

Logging

Form fixes

MEDIUM

QR verification

Backups

Error handling

Skeleton loaders

LOW

Notifications enhancement

Extra monitoring

Performance fine-tuning

FINAL SAFETY REMINDERS ⚠️

Always work on dev

Never commit .env

Never write to prod DB

Preserve existing flows

Test on real Android device when possible

If unsure → ASK FIRST