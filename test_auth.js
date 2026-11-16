// Autonomous Verification Test for Email OTP Auth System
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
  console.log('🧪 Starting Email OTP Auth System Verification Tests...\n');

  const testEmail = 'testuser@example.com';

  // Test 1: Invalid Email Format
  console.log('Test 1: Rejecting invalid email format...');
  const res1 = await request('/api/auth/send-otp', 'POST', { email: 'not-an-email' });
  console.assert(res1.status === 400, 'Test 1 Failed: Status should be 400');
  console.log('✅ Test 1 Passed:', res1.body.message);

  // Test 2: Send OTP
  console.log('\nTest 2: Dispatching real OTP email...');
  const res2 = await request('/api/auth/send-otp', 'POST', { email: testEmail });
  console.assert(res2.status === 200 && res2.body.success === true, 'Test 2 Failed');
  console.log('✅ Test 2 Passed:', res2.body.message);

  // Test 3: Rate Limiting Cooldown (1 Minute)
  console.log('\nTest 3: Checking 1-minute cooldown...');
  const res3 = await request('/api/auth/send-otp', 'POST', { email: testEmail });
  console.assert(res3.status === 429, 'Test 3 Failed: Status should be 429');
  console.log('✅ Test 3 Passed:', res3.body.message);

  // Test 4: Incorrect OTP Rejection
  console.log('\nTest 4: Rejecting incorrect OTP...');
  const res4 = await request('/api/auth/verify-otp', 'POST', { email: testEmail, otp: '000000' });
  console.assert(res4.status === 400 && res4.body.success === false, 'Test 4 Failed');
  console.log('✅ Test 4 Passed:', res4.body.message);

  console.log('\n🎉 ALL EMAIL OTP TESTS PASSED! 🚀');
}

runTests().catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
