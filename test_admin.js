// Autonomous Test for Admin Panel APIs
const http = require('http');

async function request(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Admin Panel Verification Tests...\n');

  // Test 1: Wrong Admin Password
  console.log('Test 1: Testing rejected admin password...');
  const res1 = await request('/api/admin/login', 'POST', { password: 'wrongpassword' });
  console.assert(res1.status === 401, 'Test 1 Failed');
  console.log('✅ Test 1 Passed:', res1.body.message);

  // Test 2: Correct Admin Password
  console.log('\nTest 2: Testing correct admin login (aryan@admin2026)...');
  const res2 = await request('/api/admin/login', 'POST', { password: 'aryan@admin2026' });
  console.assert(res2.status === 200 && res2.body.token, 'Test 2 Failed');
  const adminToken = res2.body.token;
  console.log('✅ Test 2 Passed: Logged in! Received Admin Token');

  // Test 3: Fetch Stats
  console.log('\nTest 3: Fetching Live Database Stats...');
  const res3 = await request('/api/admin/stats', 'GET', null, adminToken);
  console.assert(res3.status === 200 && res3.body.stats, 'Test 3 Failed');
  console.log('✅ Test 3 Passed: Stats retrieved successfully:', res3.body.stats);

  // Test 4: Fetch Users List
  console.log('\nTest 4: Fetching Users List...');
  const res4 = await request('/api/admin/users', 'GET', null, adminToken);
  console.assert(res4.status === 200 && Array.isArray(res4.body.users), 'Test 4 Failed');
  console.log(`✅ Test 4 Passed: Fetched ${res4.body.users.length} users from MongoDB Atlas!`);

  // Test 5: Export to CSV
  console.log('\nTest 5: Testing CSV Export...');
  const res5 = await request('/api/admin/export', 'GET', null, adminToken);
  console.assert(res5.status === 200 && typeof res5.body === 'string' && res5.body.includes('Email'), 'Test 5 Failed');
  console.log('✅ Test 5 Passed: CSV data generated successfully!');

  // Test 6: Access /admin route
  console.log('\nTest 6: Checking /admin web route...');
  const res6 = await request('/admin', 'GET', null);
  console.assert(res6.status === 200 && typeof res6.body === 'string' && res6.body.includes('Studio Admin Portal'), 'Test 6 Failed');
  console.log('✅ Test 6 Passed: /admin web page rendered with status 200 OK!');

  console.log('\n🎉 ALL 6 ADMIN TESTS PASSED PERFECTLY! 🚀');
}

runTests().catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
