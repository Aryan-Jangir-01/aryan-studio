// State
let adminToken = localStorage.getItem('admin_token');
let currentUsers = [];

// DOM Elements - Login View
const loginView = document.getElementById('admin-login-view');
const dashboardView = document.getElementById('admin-dashboard-view');
const loginForm = document.getElementById('admin-login-form');
const passwordInput = document.getElementById('admin-password-input');
const loginError = document.getElementById('login-error');
const btnLoginSubmit = document.getElementById('btn-login-submit');
const btnLoginText = document.getElementById('btn-login-text');
const btnLoginSpinner = document.getElementById('btn-login-spinner');

// DOM Elements - Dashboard
const btnLogout = document.getElementById('btn-admin-logout');
const statTotalUsers = document.getElementById('stat-total-users');
const statVerifiedUsers = document.getElementById('stat-verified-users');
const statTotalLogins = document.getElementById('stat-total-logins');
const statTodayUsers = document.getElementById('stat-today-users');

const searchInput = document.getElementById('search-input');
const btnRefresh = document.getElementById('btn-refresh');
const refreshIcon = document.getElementById('refresh-icon');
const btnExportCsv = document.getElementById('btn-export-csv');
const usersTableBody = document.getElementById('users-table-body');
const emptyState = document.getElementById('empty-state');

// -------------------------------------------------------------
// Helper: Format Date
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// Authentication Flow
// -------------------------------------------------------------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = passwordInput.value.trim();

  if (!password) return;

  loginError.classList.add('hidden');
  btnLoginSubmit.disabled = true;
  btnLoginText.textContent = 'Verifying Password...';
  btnLoginSpinner.classList.remove('hidden');

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      loginError.textContent = data.message || 'Incorrect Admin Password.';
      loginError.classList.remove('hidden');
      passwordInput.value = '';
      passwordInput.focus();
      return;
    }

    // Success! Save token
    adminToken = data.token;
    localStorage.setItem('admin_token', adminToken);

    showDashboard();

  } catch (err) {
    loginError.textContent = 'Server connection error.';
    loginError.classList.remove('hidden');
  } finally {
    btnLoginSubmit.disabled = false;
    btnLoginText.textContent = 'Unlock Admin Dashboard';
    btnLoginSpinner.classList.add('hidden');
  }
});

function showDashboard() {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  loadStats();
  loadUsers();
}

function showLogin() {
  localStorage.removeItem('admin_token');
  adminToken = null;
  dashboardView.classList.add('hidden');
  loginView.classList.remove('hidden');
  passwordInput.value = '';
}

btnLogout.addEventListener('click', showLogin);

// -------------------------------------------------------------
// Fetch Stats
// -------------------------------------------------------------
async function loadStats() {
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (res.status === 401 || res.status === 403) {
      showLogin();
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
    console.error('Failed to load stats:', e);
  }
}

// -------------------------------------------------------------
// Fetch Users List
// -------------------------------------------------------------
async function loadUsers(search = '') {
  refreshIcon.classList.add('animate-spin');

  try {
    const url = search ? `/api/admin/users?search=${encodeURIComponent(search)}` : '/api/admin/users';
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (res.status === 401 || res.status === 403) {
      showLogin();
      return;
    }

    const data = await res.json();
    currentUsers = data.users || [];
    renderUsersTable(currentUsers);

  } catch (e) {
    console.error('Failed to load users:', e);
  } finally {
    refreshIcon.classList.remove('animate-spin');
  }
}

// -------------------------------------------------------------
// Render Users Table
// -------------------------------------------------------------
function renderUsersTable(users) {
  usersTableBody.innerHTML = '';

  if (!users || users.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  users.forEach((user) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 transition duration-150';

    tr.innerHTML = `
      <td class="px-6 py-4 font-mono font-medium text-slate-100 flex items-center gap-2">
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
        <button onclick="handleDeleteUser('${user._id}', '${user.email}')" 
          class="text-rose-400 hover:text-rose-300 font-medium hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition border border-transparent hover:border-rose-500/20">
          Delete
        </button>
      </td>
    `;

    usersTableBody.appendChild(tr);
  });
}

// -------------------------------------------------------------
// Delete User
// -------------------------------------------------------------
window.handleDeleteUser = async (id, email) => {
  const confirmed = confirm(`Are you sure you want to delete user: ${email}?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const data = await res.json();
    if (data.success) {
      loadStats();
      loadUsers(searchInput.value.trim());
    } else {
      alert(data.message || 'Failed to delete user.');
    }
  } catch (e) {
    alert('Error connecting to server.');
  }
};

// -------------------------------------------------------------
// Search & Refresh
// -------------------------------------------------------------
let searchTimeout = null;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadUsers(e.target.value.trim());
  }, 300);
});

btnRefresh.addEventListener('click', () => {
  loadStats();
  loadUsers(searchInput.value.trim());
});

// -------------------------------------------------------------
// Export to CSV
// -------------------------------------------------------------
btnExportCsv.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/admin/export', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!res.ok) {
      alert('Failed to export data.');
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

  } catch (err) {
    alert('Export error: ' + err.message);
  }
});

// -------------------------------------------------------------
// Initialize
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  if (adminToken) {
    showDashboard();
  } else {
    showLogin();
  }
});
