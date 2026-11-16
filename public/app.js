// State Variables
let currentEmail = '';
let resendTimerInterval = null;
let resendCooldown = 60; // 1 minute countdown

// DOM Elements
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
const toast = document.getElementById('toast');

// -------------------------------------------------------------
// Toast Notification
// -------------------------------------------------------------
function showToast(message, type = 'info') {
  toast.classList.remove('hidden', 'bg-rose-500/20', 'border-rose-500/40', 'text-rose-200', 'bg-emerald-500/20', 'border-emerald-500/40', 'text-emerald-200', 'bg-indigo-500/20', 'border-indigo-500/40', 'text-indigo-200');
  toast.classList.add('border');

  if (type === 'error') {
    toast.classList.add('bg-rose-500/20', 'border-rose-500/40', 'text-rose-200');
  } else if (type === 'success') {
    toast.classList.add('bg-emerald-500/20', 'border-emerald-500/40', 'text-emerald-200');
  } else {
    toast.classList.add('bg-indigo-500/20', 'border-indigo-500/40', 'text-indigo-200');
  }

  toast.textContent = message;
}

function hideToast() {
  toast.classList.add('hidden');
}

// -------------------------------------------------------------
// Send Email OTP Handler
// -------------------------------------------------------------
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
    const res = await fetch('/api/auth/send-otp', {
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
      showToast('Timeout: Server se connect nahi ho paya. Render Environment Variables check karein.', 'error');
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

// -------------------------------------------------------------
// Resend OTP Countdown (1 Minute)
// -------------------------------------------------------------
function startResendCountdown() {
  clearInterval(resendTimerInterval);
  resendCooldown = 60; // 1 minute (60 seconds)
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

// -------------------------------------------------------------
// 6-Digit OTP Box Management
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// Verify OTP Handler
// -------------------------------------------------------------
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
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch('/api/auth/verify-otp', {
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
    renderDashboard(currentEmail, data.token);

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

// -------------------------------------------------------------
// Render Dashboard
// -------------------------------------------------------------
function renderDashboard(email, token) {
  clearInterval(resendTimerInterval);
  stepEmail.classList.add('hidden');
  stepOtp.classList.add('hidden');
  stepDashboard.classList.remove('hidden');

  sessionEmail.textContent = email;
}

// -------------------------------------------------------------
// Test Protected Route
// -------------------------------------------------------------
btnTestApi.addEventListener('click', async () => {
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  apiResponseBox.classList.remove('hidden');
  apiResponseBox.textContent = 'Testing GET /api/auth/session...';

  try {
    const res = await fetch('/api/auth/session', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    apiResponseBox.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    apiResponseBox.textContent = 'Error testing protected route.';
  }
});

btnLogout.addEventListener('click', () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_email');
  stepDashboard.classList.add('hidden');
  stepEmail.classList.remove('hidden');
  apiResponseBox.classList.add('hidden');
  emailInput.value = '';
  clearOtpBoxes();
  showToast('Logged out successfully.', 'info');
});

// Check if user is already authenticated
window.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('auth_token');
  const savedEmail = localStorage.getItem('auth_email');

  if (token && savedEmail) {
    try {
      const res = await fetch('/api/auth/session', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        renderDashboard(savedEmail, token);
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (e) {}
  }
});
