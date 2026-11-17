# Implementation Plan: Unified Studio & Admin Dashboard with 2FA (Password + OTP)

## 1. Objective
Enhance the Studio Admin Dashboard with enterprise-grade Two-Factor Authentication (2FA) requiring both:
1. **Master Admin Password** (`aryan@admin2026`)
2. **Real Email OTP Verification** sent to the owner's Gmail (`aryanjangir0805@gmail.com`) with 1-minute expiration and 3-attempt brute-force protection.

## 2. Key Architecture & 2FA Flow
- **Backend (`server.js`):**
  - `POST /api/admin/login`:
    - Validates master password.
    - If valid, generates a secure 6-digit Admin OTP, hashes it with salt, sets 1-minute expiration, and dispatches an alert email to the admin Gmail.
    - Returns `{ success: true, requireOtp: true, tempSessionId, maskedEmail }`.
  - `POST /api/admin/verify-otp`:
    - Validates the 6-digit Admin OTP against the `tempSessionId`.
    - Enforces 1-minute expiration and max 3 incorrect attempts.
    - On success, issues the final Admin JWT token with `role: 'admin'`.
  - `POST /api/admin/resend-otp`:
    - Allows resending Admin OTP with strict 60-second cooldown.
- **Frontend (`public/index.html`, `public/app.js`):**
  - `#admin-step-password`: Master password entry.
  - `#admin-step-otp`: 6-digit auto-advancing admin OTP inputs, 60s countdown timer, resend button, and verification handler.
  - `#admin-data-view`: Unlocks full live stats & user management upon successful 2FA.

## 3. Execution Roadmap
- [x] Task 1: Spec and 2FA architecture definition in PLAN.md.
- [ ] Task 2: Implement Admin 2FA endpoints (`/api/admin/login`, `/api/admin/verify-otp`, `/api/admin/resend-otp`) in `server.js`.
- [ ] Task 3: Update `public/index.html` with Admin 2FA UI (Password Step + OTP Step).
- [ ] Task 4: Implement 2FA client logic in `public/app.js`.
- [ ] Task 5: Update `test_admin.js` to verify password rejection, OTP dispatch, brute-force blocking, and final 2FA unlock.
- [ ] Task 6: Commit and push changes to GitHub.
