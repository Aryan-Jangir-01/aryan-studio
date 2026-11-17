# Implementation Plan: Unified Studio & Admin Dashboard

## 1. Objective
Merge the User Authentication Portal and the Admin Dashboard into a single, cohesive, responsive Single Page Application (SPA) at `public/index.html`.

## 2. Key Architecture & Features
- **Unified Header & Navigation Bar:**
  - Aryan Jangir Studio branding + live MongoDB Atlas Cloud status indicator.
  - Tab Switcher: `[👤 User Portal]` and `[🛡️ Admin Dashboard]`.
  - Hash-based navigation (`/#user`, `/#admin`) so direct `/admin` visits automatically land on Admin mode.
- **Unified User Portal:**
  - Step 1: Email input with validation.
  - Step 2: 6-digit auto-advancing OTP boxes with 60s cooldown.
  - Step 3: Verified User Profile & protected session tester, plus direct shortcut to Admin Dashboard.
- **Unified Admin Dashboard:**
  - Secure unlock card (master password `aryan@admin2026`).
  - 4 KPI Stat Cards (Total Users, Verified OTPs, Total Sessions, Today's Signups).
  - Search filter by email.
  - 1-Click CSV/Excel data export.
  - Interactive table of registered users with deletion support.
  - Admin Lock / Sign out button.

## 3. Execution Roadmap
- [x] Task 1: Spec and architecture definition in PLAN.md.
- [ ] Task 2: Build unified UI in `public/index.html` with Tailwind & responsive layouts.
- [ ] Task 3: Combine client logic into `public/app.js` (tab switching, OTP auth, admin stats/table/export).
- [ ] Task 4: Update `server.js` route for `/admin` to redirect seamlessly to `/#admin`.
- [ ] Task 5: Verify all automated test suites and live interactions.
- [ ] Task 6: Commit and push changes to GitHub (`Aryan-Jangir-01/aryan-studio`).
