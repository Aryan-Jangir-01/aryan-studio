# 🚀 Aryan Jangir Studio • Full-Stack Platform & Master Control Plane

A production-grade, secure, modern Web Application and Administration Platform built for **Aryan Jangir Studio** featuring real **Gmail SMTP Email OTP Authentication**, **MongoDB Atlas Cloud Database**, and a **Master Admin Dashboard protected by Two-Factor Authentication (Password + Email OTP 2FA)**.

---

## 🌟 Key Platform Highlights

### 1. 🔐 Unified 2-in-1 Single Page Architecture
* **Top Navigation & Portal Switcher:**
  * Toggle effortlessly between **👤 User Portal** and **🛡️ Admin Dashboard** without reloading.
  * Real-time **MongoDB Atlas Cloud** live connectivity status indicator.
  * Deep-linking support via hash (`/#user`, `/#admin`) and direct `/admin` routing.

### 2. 📧 Email OTP Authentication (User Portal)
* **Real Gmail SMTP Dispatch:** Direct dispatch of HTML-styled emails via Google App Passwords.
* **Smart 6-Box OTP Input:**
  * Auto-focus advances to the next digit as you type.
  * Backspace jumps back to the previous input box.
  * Direct clipboard paste splits digits across all 6 boxes.
  * Auto-submits immediately when the 6th digit is filled.
* **Enterprise Security Standards:**
  * Salted SHA-256 cryptographic hashing (never stored plaintext).
  * 1-Minute expiration window (60 seconds).
  * 60-Second resend cooldown timer.
  * 3-Attempt brute-force defense shield (invalidates OTP upon 3 failures).
  * HMAC SHA-256 JWT session issuance upon verification.

### 3. 🛡️ Studio Master Admin Dashboard (with 2FA)
* **Two-Factor Authentication (2FA):**
  * **Factor 1:** Master Admin Password verification (`aryan@admin2026`).
  * **Factor 2:** Real 6-digit 2FA Security Code sent to the owner's Gmail (`aryanjangir0805@gmail.com`).
* **Live MongoDB Atlas Analytics:**
  * **Total Registered Users**
  * **Verified Leads (100% Genuine)**
  * **Total User Logins**
  * **Today's Registrations**
* **Real-time User Management:**
  * Instant search by email.
  * 1-Click CSV/Excel data export.
  * Live user registry table with deletion capability.
  * 1-Click "Lock Admin" session kill switch.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Node.js, Express.js, Mongoose ODM, JWT, Nodemailer, Crypto |
| **Database** | MongoDB Atlas Cloud (AWS ap-south-1 Mumbai) |
| **Frontend** | Vanilla JS (ES6+), HTML5, Tailwind CSS, Glassmorphic UI |
| **Email Service** | Google Gmail SMTP (Port 465 SSL) |
| **Cloud Hosting** | Render, GitHub |

---

## 🚀 Quick Start Guide

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/Aryan-Jangir-01/aryan-studio.git
cd aryan-studio
npm install
```

### 2. Configure Environment Variables (`.env`)
Create a `.env` file in the root folder:
```env
PORT=3000
JWT_SECRET=your_super_secret_jwt_key
EMAIL_USER=aryanjangir0805@gmail.com
EMAIL_PASS=your_google_app_password
MONGODB_URI=mongodb+srv://<username>:<password>@aryanjangir.ay2my7q.mongodb.net/aryan_studio?retryWrites=true&w=majority
ADMIN_PASSWORD=aryan@admin2026
ADMIN_EMAIL=aryanjangir0805@gmail.com
```

### 3. Start Server
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Verification Test Suites

Run both end-to-end autonomous test suites:
```bash
# Verify Email OTP Authentication
node test_auth.js

# Verify Admin 2FA, APIs, Stats & CSV Export
node test_admin.js
```

---

## 🌐 Live Deployment (Render)

1. Connect your repository on [Render](https://render.com) as a **Web Service**.
2. Set Build Command: `npm install`
3. Set Start Command: `node server.js`
4. Add the 5 Environment Variables in the Render Dashboard (`EMAIL_USER`, `EMAIL_PASS`, `MONGODB_URI`, `JWT_SECRET`, `ADMIN_PASSWORD`).
5. In **MongoDB Atlas** -> **Network Access**, ensure `0.0.0.0/0` ("Allow Access from Anywhere") is Active.

---

## 👤 Author
**Aryan Jangir**  
*Aryan Jangir Studio • Design • Development • Media Production*
