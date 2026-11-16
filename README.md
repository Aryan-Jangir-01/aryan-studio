# 📱 Secure Phone OTP Authentication System

A complete, production-ready Phone Number OTP Authentication and Verification system built with **Node.js**, **Express**, **JWT**, and modern **Tailwind CSS**.

---

## 🚀 Key Features

* **Mobile-First Responsive UI:** Sleek modern dark glassmorphic design.
* **Country Code Selector:** Includes India (`+91`), USA (`+1`), UK (`+44`), UAE (`+971`), and Australia (`+61`).
* **Interactive 6-Box OTP Input:**
  * Auto-focus advances to the next digit as you type.
  * Backspace jumps back to the previous input box.
  * Direct clipboard paste support (splits 6 digits across all boxes).
  * Auto-submits immediately when the 6th digit is entered.
* **Cryptographic Security:**
  * 6-digit random integers generated via `crypto.randomInt`.
  * Stored as salted SHA-256 hashes (never plaintext).
  * 5-minute expiry window.
* **Anti-Abuse & Protection:**
  * **Cooldown Limiter:** Minimum 60 seconds (1 minute) wait before requesting another OTP.
  * **Validity Window:** OTP is valid for exactly 1 minute (60 seconds).
  * **Brute-Force Shield:** Max 3 failed attempts per OTP before the code is permanently invalidated.
* **JWT Session Management:**
  * Issues an HMAC SHA-256 signed JWT session token upon successful verification.
  * Protected backend endpoints (`/api/auth/session`) accessible only with valid `Bearer` token.
* **Dev/Demo Mode:**
  * Automatically reveals the generated OTP on-screen with an instant **"Auto-fill"** button for effortless local testing.

---

## 🛠️ How to Run

1. Open your terminal in this project folder:
   ```bash
   npm start
   ```
2. Open your web browser and go to:
   ```text
   http://localhost:3000
   ```

---

## 📁 Project Structure

```text
├── server.js            # Express backend with OTP generation, rate-limits & JWT
├── test_auth.js         # Automated end-to-end verification test suite
├── package.json         # Project metadata and dependencies
├── .env.example         # Environment variables template
├── public/
│   ├── index.html       # Clean HTML5 UI with Tailwind CSS
│   ├── app.js           # Frontend interactivity, OTP box logic & API calls
│   └── style.css        # Custom animations and styling
└── PLAN.md              # Specification & implementation plan
```
