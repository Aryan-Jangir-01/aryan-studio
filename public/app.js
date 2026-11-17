// =============================================================
// ARYAN JANGIR STUDIO - UNIFIED PORTAL (USER + ADMIN)
// =============================================================

// Dynamic API Base: Automatically routes API calls to live Render cloud backend if loaded from GitHub Pages (github.io)
const API_BASE = (window.location.hostname.includes('github.io'))
  ? (localStorage.getItem('studio_api_url') || 'https://aryan-studio.onrender.com')
  : '';

// -------------------------------------------------------------
// 1. Toast Notification System
// -------------------------------------------------------------
const toast = document.getElementById('toast');
let toastTimeout = null;

function showToast(message, type = 'info') {
  clearTimeout(toastTimeout);
  toast.classList.remove('hidden', 'bg-rose-500/20', 'border-rose-500/40', 'text-rose-200', 'bg-emerald-500/20', 'border-emerald-500/40', 'text-emerald-200', 'bg-indigo-500/20', 'border-indigo-500/40', 'text-indigo-200');

  if (type === 'error') {
    toast.classList.add('bg-rose-500/20', 'border-rose-500/40', 'text-rose-200');
  } else if (type === 'success') {
    toast.classList.add('bg-emerald-500/20', 'border-emerald-500/40', 'text-emerald-200');
  } else {
    toast.classList.add('bg-indigo-500/20', 'border-indigo-500/40', 'text-indigo-200');
  }

  toast.textContent = message;
  toast.classList.remove('hidden');

  // Auto-hide toast after 6 seconds
  toastTimeout = setTimeout(() => {
    hideToast();
  }, 6000);
}

function hideToast() {
  toast.classList.add('hidden');
}

// -------------------------------------------------------------
// 2. Tab Switching Navigation (User Portal vs Admin Dashboard)
// -------------------------------------------------------------
const tabBtnUser = document.getElementById('tab-btn-user');
const tabBtnAdmin = document.getElementById('tab-btn-admin');
const viewUser = document.getElementById('view-user');
const viewAdmin = document.getElementById('view-admin');
const activeTabBadge = document.getElementById('active-tab-badge');

let currentActiveTab = 'user';

function switchTab(targetTab, updateHash = true) {
  currentActiveTab = targetTab;
  hideToast();

  const activeBtnClasses = ['bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30'];
  const inactiveBtnClasses = ['text-slate-400', 'hover:text-slate-200'];

  if (targetTab === 'admin') {
    // Show Admin, Hide User
    viewUser.classList.add('hidden');
    viewAdmin.classList.remove('hidden');

    tabBtnAdmin.classList.remove(...inactiveBtnClasses);
    tabBtnAdmin.classList.add(...activeBtnClasses);

    tabBtnUser.classList.remove(...activeBtnClasses);
    tabBtnUser.classList.add(...inactiveBtnClasses);

    activeTabBadge.textContent = 'Admin Dashboard';
    activeTabBadge.className = 'px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30';

    if (updateHash) {
      history.replaceState(null, '', '#admin');
    }

    // Check if admin is unlocked
    if (adminToken) {
      showAdminDashboard();
    } else {
      showAdminUnlock();
    }

  } else {
    // Show User, Hide Admin
    viewAdmin.classList.add('hidden');
    viewUser.classList.remove('hidden');

    tabBtnUser.classList.remove(...inactiveBtnClasses);
    tabBtnUser.classList.add(...activeBtnClasses);

    tabBtnAdmin.classList.remove(...activeBtnClasses);
    tabBtnAdmin.classList.add(...inactiveBtnClasses);

    activeTabBadge.textContent = 'User Portal';
    activeTabBadge.className = 'px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';

    if (updateHash) {
      history.replaceState(null, '', '#user');
    }
  }
}

tabBtnUser.addEventListener('click', () => switchTab('user'));
tabBtnAdmin.addEventListener('click', () => switchTab('admin'));

const btnBackToUser = document.getElementById('btn-back-to-user');
if (btnBackToUser) {
  btnBackToUser.addEventListener('click', () => switchTab('user'));
}

const btnQuickAdmin = document.getElementById('btn-quick-admin');
if (btnQuickAdmin) {
  btnQuickAdmin.addEventListener('click', () => switchTab('admin'));
}

// -------------------------------------------------------------
// 3. USER PORTAL: EMAIL OTP AUTHENTICATION
// -------------------------------------------------------------
let currentEmail = '';
let resendTimerInterval = null;
let resendCooldown = 60; // 1 minute countdown

const stepEmail = document.getElementById('step-email');
const stepOtp = document.getElementById('step-otp');
const stepDashboard = document.getElementById('step-dashboard');

const emailInput = document.getElementById('email-input');
const btnSendOtp = document.getElementById('btn-send-otp');
const btnSendText = document.getElementById('btn-send-text');
const btnSendSpinner = document.getElementById('btn-send-spinner');

const displayEmail = document.getElementById('display-email');
const btnChangeEmail = document.getElementById('btn-change-email');

const otpBoxes = document.querySelectorAll('.otp-box');
const otpContainer = document.getElementById('otp-inputs-container');
const btnVerifyOtp = document.getElementById('btn-verify-otp');
const btnVerifyText = document.getElementById('btn-verify-text');
const btnVerifySpinner = document.getElementById('btn-verify-spinner');

const resendCountdownText = document.getElementById('resend-countdown-text');
const resendSeconds = document.getElementById('resend-seconds');
const btnResend = document.getElementById('btn-resend');

const sessionEmail = document.getElementById('session-email');
const btnTestApi = document.getElementById('btn-test-api');
const btnLogout = document.getElementById('btn-logout');
const apiResponseBox = document.getElementById('api-response-box');

// Send Email OTP Handler
async function handleSendOtp() {
  const email = emailInput.value.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    showToast('Kripya ek valid email address enter karein.', 'error');
    emailInput.focus();
    return;
  }

  currentEmail = email;

  btnSendOtp.disabled = true;
  btnSendText.textContent = 'Sending Code...';
  btnSendSpinner.classList.remove('hidden');
  hideToast();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast(data.message || 'OTP bhejne me dikkat aayi.', 'error');
      return;
    }

    showToast('Real OTP aapke Gmail par bhej diya gaya hai! Check your inbox.', 'success');
    displayEmail.textContent = email;

    stepEmail.classList.add('hidden');
    stepOtp.classList.remove('hidden');

    clearOtpBoxes();
    otpBoxes[0].focus();

    startResendCountdown();

  } catch (err) {
    console.error('Send OTP Error:', err);
    if (err.name === 'AbortError') {
      showToast('Timeout: Server ko connect karne me samay lag raha hai. Dobara try karein.', 'error');
    } else {
      showToast('Server connection error. Kripya dobara try karein.', 'error');
    }
  } finally {
    clearTimeout(timeoutId);
    btnSendOtp.disabled = false;
    btnSendText.textContent = 'Send Verification Code';
    btnSendSpinner.classList.add('hidden');
  }
}

btnSendOtp.addEventListener('click', handleSendOtp);
emailInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSendOtp();
});

// 1-Minute Resend Countdown
function startResendCountdown() {
  clearInterval(resendTimerInterval);
  resendCooldown = 60;
  resendSeconds.textContent = resendCooldown;
  resendCountdownText.classList.remove('hidden');
  btnResend.classList.add('hidden');

  resendTimerInterval = setInterval(() => {
    resendCooldown--;
    resendSeconds.textContent = resendCooldown;

    if (resendCooldown <= 0) {
      clearInterval(resendTimerInterval);
      resendCountdownText.classList.add('hidden');
      btnResend.classList.remove('hidden');
    }
  }, 1000);
}

btnResend.addEventListener('click', () => {
  handleSendOtp();
});

btnChangeEmail.addEventListener('click', () => {
  clearInterval(resendTimerInterval);
  stepOtp.classList.add('hidden');
  stepEmail.classList.remove('hidden');
  hideToast();
  emailInput.focus();
});

// 6-Digit OTP Box Management
function clearOtpBoxes() {
  otpBoxes.forEach((box) => {
    box.value = '';
    box.classList.remove('filled');
  });
}

function getEnteredOtp() {
  let code = '';
  otpBoxes.forEach((box) => { code += box.value; });
  return code;
}

otpBoxes.forEach((box, index) => {
  box.addEventListener('input', (e) => {
    const val = e.target.value.replace(/\D/g, '');
    box.value = val ? val[0] : '';

    if (box.value) {
      box.classList.add('filled');
      if (index < otpBoxes.length - 1) {
        otpBoxes[index + 1].focus();
      }
    } else {
      box.classList.remove('filled');
    }

    if (getEnteredOtp().length === 6) {
      handleVerifyOtp();
    }
  });

  box.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !box.value && index > 0) {
      otpBoxes[index - 1].focus();
    }
  });

  box.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
    const cleanNumbers = pasteData.replace(/\D/g, '').slice(0, 6);

    if (cleanNumbers.length > 0) {
      cleanNumbers.split('').forEach((char, i) => {
        if (otpBoxes[i]) {
          otpBoxes[i].value = char;
          otpBoxes[i].classList.add('filled');
        }
      });

      const nextFocus = Math.min(cleanNumbers.length, otpBoxes.length - 1);
      otpBoxes[nextFocus].focus();

      if (cleanNumbers.length === 6) {
        handleVerifyOtp();
      }
    }
  });
});

// Verify OTP Handler
async function handleVerifyOtp() {
  const otpCode = getEnteredOtp();

  if (otpCode.length !== 6) {
    showToast('Kripya 6-digit OTP code enter karein.', 'error');
    return;
  }

  btnVerifyOtp.disabled = true;
  btnVerifyText.textContent = 'Verifying...';
  btnVerifySpinner.classList.remove('hidden');
  hideToast();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentEmail,
        otp: otpCode
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast(data.message || 'Verification failed.', 'error');
      otpContainer.classList.add('shake');
      setTimeout(() => otpContainer.classList.remove('shake'), 400);
      return;
    }

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_email', currentEmail);

    showToast('Email verified successfully!', 'success');
    renderUserDashboard(currentEmail, data.token);

    // Also auto-refresh admin stats if admin view is unlocked
    if (adminToken) {
      loadAdminStats();
    }

  } catch (err) {
    console.error('Verify error:', err);
    if (err.name === 'AbortError') {
      showToast('Timeout: Verification me samay lag raha hai. Dobara try karein.', 'error');
    } else {
      showToast('Network error while verifying OTP.', 'error');
    }
  } finally {
    clearTimeout(timeoutId);
    btnVerifyOtp.disabled = false;
    btnVerifyText.textContent = 'Verify & Continue';
    btnVerifySpinner.classList.add('hidden');
  }
}

btnVerifyOtp.addEventListener('click', handleVerifyOtp);

// Render User Dashboard
function renderUserDashboard(email, token) {
  sessionEmail.textContent = email;
  stepEmail.classList.add('hidden');
  stepOtp.classList.add('hidden');
  stepDashboard.classList.remove('hidden');

  btnTestApi.onclick = async () => {
    try {
      btnTestApi.disabled = true;
      btnTestApi.textContent = 'Testing Token...';

      const res = await fetch(`${API_BASE}/api/auth/test-token`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();

      apiResponseBox.classList.remove('hidden');
      apiResponseBox.innerHTML = `
        <div class="text-emerald-400 font-semibold mb-1">Status 200 OK - Token Valid</div>
        <pre>${JSON.stringify(resData, null, 2)}</pre>
      `;
      showToast('Protected Route Verification Success!', 'success');
    } catch (err) {
      showToast('Failed to call protected API.', 'error');
    } finally {
      btnTestApi.disabled = false;
      btnTestApi.textContent = 'Test JWT Token';
    }
  };

  btnLogout.onclick = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    stepDashboard.classList.add('hidden');
    stepEmail.classList.remove('hidden');
    apiResponseBox.classList.add('hidden');
    emailInput.value = '';
    showToast('Signed out successfully.', 'info');
  };
}

// -------------------------------------------------------------
// 4. STUDIO ADMIN PORTAL: MASTER DATABASE & LIVE ANALYTICS
// -------------------------------------------------------------
let adminToken = localStorage.getItem('admin_token');
let currentAdminUsers = [];

const adminUnlockView = document.getElementById('admin-unlock-view');
const adminDataView = document.getElementById('admin-data-view');
const adminLoginForm = document.getElementById('admin-login-form');
const adminPasswordInput = document.getElementById('admin-password-input');
const adminLoginError = document.getElementById('admin-login-error');
const btnAdminLoginSubmit = document.getElementById('btn-admin-login-submit');
const btnAdminLoginText = document.getElementById('btn-admin-login-text');
const btnAdminLoginSpinner = document.getElementById('btn-admin-login-spinner');

const statTotalUsers = document.getElementById('stat-total-users');
const statVerifiedUsers = document.getElementById('stat-verified-users');
const statTotalLogins = document.getElementById('stat-total-logins');
const statTodayUsers = document.getElementById('stat-today-users');

const adminSearchInput = document.getElementById('admin-search-input');
const btnAdminRefresh = document.getElementById('btn-admin-refresh');
const adminRefreshIcon = document.getElementById('admin-refresh-icon');
const btnAdminExport = document.getElementById('btn-admin-export');
const btnAdminLock = document.getElementById('btn-admin-lock');
const adminUsersTableBody = document.getElementById('admin-users-table-body');
const adminEmptyState = document.getElementById('admin-empty-state');

// Admin 2FA DOM Elements
const adminEmailInput = document.getElementById('admin-email-input');
const adminStepPassword = document.getElementById('admin-step-password');
const adminStepOtp = document.getElementById('admin-step-otp');
const adminDisplayEmail = document.getElementById('admin-display-email');
const btnAdminChangePassword = document.getElementById('btn-admin-change-password');
const adminOtpBoxes = document.querySelectorAll('.admin-otp-box');
const adminOtpContainer = document.getElementById('admin-otp-inputs-container');
const btnAdminVerifyOtp = document.getElementById('btn-admin-verify-otp');
const btnAdminVerifyText = document.getElementById('btn-admin-verify-text');
const btnAdminVerifySpinner = document.getElementById('btn-admin-verify-spinner');
const adminResendCountdownText = document.getElementById('admin-resend-countdown-text');
const adminResendSeconds = document.getElementById('admin-resend-seconds');
const btnAdminResend = document.getElementById('btn-admin-resend');

// Show/Hide Password Toggle
const btnTogglePassword = document.getElementById('btn-toggle-password');
const eyeIconShow = document.getElementById('eye-icon-show');
const eyeIconHide = document.getElementById('eye-icon-hide');

if (btnTogglePassword && adminPasswordInput) {
  btnTogglePassword.addEventListener('click', () => {
    const isPassword = adminPasswordInput.type === 'password';
    adminPasswordInput.type = isPassword ? 'text' : 'password';

    if (isPassword) {
      eyeIconShow.classList.add('hidden');
      eyeIconHide.classList.remove('hidden');
    } else {
      eyeIconShow.classList.remove('hidden');
      eyeIconHide.classList.add('hidden');
    }
  });
}

let adminTempSessionId = null;
let adminResendTimerInterval = null;
let adminResendCooldown = 60;

function showAdminUnlock() {
  adminDataView.classList.add('hidden');
  adminUnlockView.classList.remove('hidden');

  // Reset to Step 1 (Password)
  clearInterval(adminResendTimerInterval);
  adminTempSessionId = null;
  if (adminStepPassword) adminStepPassword.classList.remove('hidden');
  if (adminStepOtp) adminStepOtp.classList.add('hidden');
  if (adminLoginError) adminLoginError.classList.add('hidden');

  clearAdminOtpBoxes();
  const wipeAdminInputs = () => {
    if (adminEmailInput) adminEmailInput.value = '';
    if (adminPasswordInput) adminPasswordInput.value = '';
  };
  wipeAdminInputs();
  setTimeout(wipeAdminInputs, 80);
  setTimeout(wipeAdminInputs, 250);
  setTimeout(wipeAdminInputs, 600);
}

function showAdminDashboard() {
  clearInterval(adminResendTimerInterval);
  adminUnlockView.classList.add('hidden');
  adminDataView.classList.remove('hidden');
  loadAdminStats();
  loadAdminUsers();
}

function lockAdmin() {
  localStorage.removeItem('admin_token');
  adminToken = null;
  showAdminUnlock();
  showToast('Admin portal locked.', 'info');
}

if (btnAdminLock) {
  btnAdminLock.addEventListener('click', lockAdmin);
}

// Admin Step 1: Email & Password Submit -> Dispatches 2FA Code
if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = adminEmailInput ? adminEmailInput.value.trim() : '';
    const password = adminPasswordInput.value.trim();

    if (!email || !password) return;

    adminLoginError.classList.add('hidden');
    btnAdminLoginSubmit.disabled = true;
    btnAdminLoginText.textContent = 'Verifying & Sending Admin OTP...';
    btnAdminLoginSpinner.classList.remove('hidden');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok || !data.success) {
        adminLoginError.textContent = data.message || 'Incorrect Admin Email or Password.';
        adminLoginError.classList.remove('hidden');
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
        return;
      }

      // Password verified! Advance to Step 2: 2FA OTP
      adminTempSessionId = data.tempSessionId;
      if (adminDisplayEmail) {
        adminDisplayEmail.textContent = data.maskedEmail || 'admin email';
      }

      adminStepPassword.classList.add('hidden');
      adminStepOtp.classList.remove('hidden');

      clearAdminOtpBoxes();
      if (adminOtpBoxes[0]) adminOtpBoxes[0].focus();

      startAdminResendCountdown();
      showToast('Master Password Verified! 6-digit 2FA code sent to your admin email.', 'success');

    } catch (err) {
      console.error('Admin login error:', err);
      if (err.name === 'AbortError') {
        adminLoginError.textContent = 'Connection timeout. Check Render environment and retry.';
      } else {
        adminLoginError.textContent = 'Server connection error. Check your network.';
      }
      adminLoginError.classList.remove('hidden');
    } finally {
      clearTimeout(timeoutId);
      btnAdminLoginSubmit.disabled = false;
      btnAdminLoginText.textContent = 'Verify & Send Admin OTP';
      btnAdminLoginSpinner.classList.add('hidden');
    }
  });
}

// Admin 2FA Box Management
function clearAdminOtpBoxes() {
  adminOtpBoxes.forEach((box) => {
    box.value = '';
    box.classList.remove('filled');
  });
}

function getEnteredAdminOtp() {
  let code = '';
  adminOtpBoxes.forEach((box) => { code += box.value; });
  return code;
}

adminOtpBoxes.forEach((box, index) => {
  box.addEventListener('input', (e) => {
    const val = e.target.value.replace(/\D/g, '');
    box.value = val ? val[0] : '';

    if (box.value) {
      box.classList.add('filled');
      if (index < adminOtpBoxes.length - 1) {
        adminOtpBoxes[index + 1].focus();
      }
    } else {
      box.classList.remove('filled');
    }

    if (getEnteredAdminOtp().length === 6) {
      handleAdminVerifyOtp();
    }
  });

  box.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !box.value && index > 0) {
      adminOtpBoxes[index - 1].focus();
    }
  });

  box.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
    const cleanNumbers = pasteData.replace(/\D/g, '').slice(0, 6);

    if (cleanNumbers.length > 0) {
      cleanNumbers.split('').forEach((char, i) => {
        if (adminOtpBoxes[i]) {
          adminOtpBoxes[i].value = char;
          adminOtpBoxes[i].classList.add('filled');
        }
      });

      const nextFocus = Math.min(cleanNumbers.length, adminOtpBoxes.length - 1);
      adminOtpBoxes[nextFocus].focus();

      if (cleanNumbers.length === 6) {
        handleAdminVerifyOtp();
      }
    }
  });
});

// Admin Step 2: Verify 2FA OTP
async function handleAdminVerifyOtp() {
  const otpCode = getEnteredAdminOtp();

  if (otpCode.length !== 6) {
    showToast('Kripya 6-digit Admin 2FA code enter karein.', 'error');
    return;
  }

  if (!adminTempSessionId) {
    showToast('Admin session expired. Kripya password dobara enter karein.', 'error');
    showAdminUnlock();
    return;
  }

  btnAdminVerifyOtp.disabled = true;
  btnAdminVerifyText.textContent = 'Verifying 2FA...';
  btnAdminVerifySpinner.classList.remove('hidden');
  hideToast();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE}/api/admin/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tempSessionId: adminTempSessionId,
        otp: otpCode
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast(data.message || 'Admin 2FA verification failed.', 'error');
      adminOtpContainer.classList.add('shake');
      setTimeout(() => adminOtpContainer.classList.remove('shake'), 400);

      if (res.status === 403 || (data.message && data.message.includes('expired'))) {
        setTimeout(() => showAdminUnlock(), 1500);
      }
      return;
    }

    // Success! Unlocked!
    adminToken = data.token;
    localStorage.setItem('admin_token', adminToken);
    showToast('Admin 2FA Verified! Studio Dashboard Unlocked.', 'success');
    showAdminDashboard();

  } catch (err) {
    console.error('Admin 2FA verify error:', err);
    showToast('Network error while verifying Admin 2FA code.', 'error');
  } finally {
    clearTimeout(timeoutId);
    btnAdminVerifyOtp.disabled = false;
    btnAdminVerifyText.textContent = 'Verify 2FA & Unlock Dashboard';
    btnAdminVerifySpinner.classList.add('hidden');
  }
}

if (btnAdminVerifyOtp) {
  btnAdminVerifyOtp.addEventListener('click', handleAdminVerifyOtp);
}

// Admin Resend Countdown
function startAdminResendCountdown() {
  clearInterval(adminResendTimerInterval);
  adminResendCooldown = 60;
  if (adminResendSeconds) adminResendSeconds.textContent = adminResendCooldown;
  if (adminResendCountdownText) adminResendCountdownText.classList.remove('hidden');
  if (btnAdminResend) btnAdminResend.classList.add('hidden');

  adminResendTimerInterval = setInterval(() => {
    adminResendCooldown--;
    if (adminResendSeconds) adminResendSeconds.textContent = adminResendCooldown;

    if (adminResendCooldown <= 0) {
      clearInterval(adminResendTimerInterval);
      if (adminResendCountdownText) adminResendCountdownText.classList.add('hidden');
      if (btnAdminResend) btnAdminResend.classList.remove('hidden');
    }
  }, 1000);
}

if (btnAdminResend) {
  btnAdminResend.addEventListener('click', async () => {
    if (!adminTempSessionId) {
      showToast('Session expired. Kripya password dobara enter karein.', 'error');
      showAdminUnlock();
      return;
    }

    btnAdminResend.disabled = true;
    btnAdminResend.textContent = 'Sending...';

    try {
      const res = await fetch(`${API_BASE}/api/admin/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempSessionId: adminTempSessionId })
      });

      const data = await res.json();
      if (data.success) {
        showToast('New Admin 2FA code sent to your email!', 'success');
        clearAdminOtpBoxes();
        if (adminOtpBoxes[0]) adminOtpBoxes[0].focus();
        startAdminResendCountdown();
      } else {
        showToast(data.message || 'Failed to resend Admin OTP.', 'error');
      }
    } catch (err) {
      showToast('Error requesting new Admin OTP.', 'error');
    } finally {
      btnAdminResend.disabled = false;
      btnAdminResend.textContent = 'Resend Code';
    }
  });
}

if (btnAdminChangePassword) {
  btnAdminChangePassword.addEventListener('click', () => {
    showAdminUnlock();
  });
}

// Format Date Helper
function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Fetch Admin Stats
async function loadAdminStats() {
  if (!adminToken) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (res.status === 401 || res.status === 403) {
      lockAdmin();
      return;
    }

    const data = await res.json();
    if (data.success && data.stats) {
      statTotalUsers.textContent = data.stats.totalUsers;
      statVerifiedUsers.textContent = data.stats.verifiedUsers;
      statTotalLogins.textContent = data.stats.totalLogins;
      statTodayUsers.textContent = data.stats.todayUsers;
    }
  } catch (e) {
    console.error('Failed to load admin stats:', e);
  }
}

// Fetch Admin Users List
async function loadAdminUsers(search = '') {
  if (!adminToken) return;

  if (adminRefreshIcon) {
    adminRefreshIcon.classList.add('animate-spin');
  }

  try {
    const url = search ? `${API_BASE}/api/admin/users?search=${encodeURIComponent(search)}` : `${API_BASE}/api/admin/users`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (res.status === 401 || res.status === 403) {
      lockAdmin();
      return;
    }

    const data = await res.json();
    currentAdminUsers = data.users || [];
    renderAdminUsersTable(currentAdminUsers);

  } catch (e) {
    console.error('Failed to load admin users:', e);
  } finally {
    if (adminRefreshIcon) {
      adminRefreshIcon.classList.remove('animate-spin');
    }
  }
}

// Render Admin Users Table
function renderAdminUsersTable(users) {
  if (!adminUsersTableBody) return;
  adminUsersTableBody.innerHTML = '';

  if (!users || users.length === 0) {
    adminEmptyState.classList.remove('hidden');
    return;
  }

  adminEmptyState.classList.add('hidden');

  users.forEach((user) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 transition duration-150';

    tr.innerHTML = `
      <td class="px-6 py-4 font-mono font-medium text-slate-100 flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs uppercase">
          ${user.email.charAt(0)}
        </div>
        <span>${user.email}</span>
      </td>
      <td class="px-6 py-4">
        ${user.isVerified 
          ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
               <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Verified
             </span>`
          : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-800/50">
               Pending
             </span>`
        }
      </td>
      <td class="px-6 py-4 font-mono text-slate-300">
        <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">${user.loginCount || 1}</span>
      </td>
      <td class="px-6 py-4 text-slate-400">
        ${formatDate(user.lastLoginAt)}
      </td>
      <td class="px-6 py-4 text-slate-400">
        ${formatDate(user.createdAt)}
      </td>
      <td class="px-6 py-4 text-right">
        <button onclick="handleAdminDeleteUser('${user._id}', '${user.email}')" 
          class="text-rose-400 hover:text-rose-300 font-medium hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition border border-transparent hover:border-rose-500/20 text-xs">
          Delete
        </button>
      </td>
    `;

    adminUsersTableBody.appendChild(tr);
  });
}

// Delete User from Admin Table
window.handleAdminDeleteUser = async (id, email) => {
  const confirmed = confirm(`Are you sure you want to delete user: ${email}?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const data = await res.json();
    if (data.success) {
      showToast(`User ${email} deleted successfully.`, 'info');
      loadAdminStats();
      loadAdminUsers(adminSearchInput ? adminSearchInput.value.trim() : '');
    } else {
      showToast(data.message || 'Failed to delete user.', 'error');
    }
  } catch (e) {
    showToast('Error connecting to server.', 'error');
  }
};

// Admin Search & Refresh Listeners
let adminSearchTimeout = null;
if (adminSearchInput) {
  adminSearchInput.addEventListener('input', (e) => {
    clearTimeout(adminSearchTimeout);
    adminSearchTimeout = setTimeout(() => {
      loadAdminUsers(e.target.value.trim());
    }, 300);
  });
}

if (btnAdminRefresh) {
  btnAdminRefresh.addEventListener('click', () => {
    loadAdminStats();
    loadAdminUsers(adminSearchInput ? adminSearchInput.value.trim() : '');
    showToast('Dashboard data refreshed.', 'info');
  });
}

// Export to CSV
if (btnAdminExport) {
  btnAdminExport.addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/export`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (!res.ok) {
        showToast('Failed to export CSV.', 'error');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aryan_studio_users_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Users exported to CSV successfully!', 'success');

    } catch (err) {
      showToast('Export error: ' + err.message, 'error');
    }
  });
}

// -------------------------------------------------------------
// 5. Initialize Application State & Routing
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  // Check User Auth
  const savedToken = localStorage.getItem('auth_token');
  const savedEmail = localStorage.getItem('auth_email');
  if (savedToken && savedEmail) {
    renderUserDashboard(savedEmail, savedToken);
  }

  // Handle Routing (/admin or #admin)
  const isDirectAdmin = window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
  if (isDirectAdmin) {
    switchTab('admin', false);
  } else {
    switchTab('user', false);
  }
});

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#admin') {
    switchTab('admin', false);
  } else {
    switchTab('user', false);
  }
});
