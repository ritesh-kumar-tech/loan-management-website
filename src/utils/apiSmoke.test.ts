import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
};

const waitForServer = async () => {
  for (let i = 0; i < 30; i += 1) {
    try {
      const { response } = await request('/api/health');
      if (response.ok) return true;
    } catch {
      await sleep(500);
    }
  }
  return false;
};

let serverProcess: ChildProcess | null = null;

try {
  const alreadyRunning = await waitForServer();
  if (!alreadyRunning) {
    serverProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
      cwd: process.cwd(),
      stdio: 'ignore',
      env: { ...process.env, NODE_ENV: 'test' },
    });
    assert.equal(await waitForServer(), true, 'dev server starts for API smoke tests');
  }

  const health = await request('/api/health');
  assert.equal(health.response.status, 200, 'health endpoint returns 200');

  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@dhanifinance.in', password: 'password123' }),
  });
  assert.equal(adminLogin.response.status, 200, 'admin login succeeds');
  assert.equal(adminLogin.body.user.role, 'admin', 'admin login returns admin role');

  const badPassword = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@dhanifinance.in', password: 'wrong-password' }),
  });
  assert.equal(badPassword.response.status, 401, 'invalid password is rejected');

  const unknownLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'unknown@example.com', password: 'password123' }),
  });
  assert.equal(unknownLogin.response.status, 401, 'unknown account login is rejected');

  const directApplication = await request('/api/applications/LN-2026-000101');
  assert.equal(directApplication.response.status, 403, 'direct public application lookup is blocked');

  const trackById = await request('/api/applications/track', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'LN-2026-000101' }),
  });
  assert.equal(trackById.response.status, 200, 'tracking by application ID succeeds without OTP');
  assert.equal(trackById.body.application.personalInfo.panNumber, '*****', 'public tracking masks PAN');

  const trackByMobile = await request('/api/applications/track', {
    method: 'POST',
    body: JSON.stringify({ identifier: '9876543210' }),
  });
  assert.equal(trackByMobile.response.status, 200, 'tracking by mobile succeeds without OTP');

  const trackByEmail = await request('/api/applications/track', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'aniket.verma@example.com' }),
  });
  assert.equal(trackByEmail.response.status, 400, 'tracking by email is rejected');

  const dashboard = await request('/api/admin/dashboard/summary');
  assert.equal(dashboard.response.status, 200, 'admin dashboard summary returns 200');
  assert.equal(typeof dashboard.body.summary.totalOutstanding, 'number', 'dashboard summary exposes numeric outstanding total');

  const duplicatePayment = await request('/api/payments/submit', {
    method: 'POST',
    body: JSON.stringify({
      loanAccountId: 'LA-2026-880101',
      applicationId: 'LN-2026-000101',
      userId: 'usr_customer_1',
      customerName: 'Aniket Verma',
      amount: 14191,
      utrNumber: 'UTR402910839120',
    }),
  });
  assert.equal(duplicatePayment.response.status, 400, 'duplicate UTR is rejected');

  console.log('api smoke tests passed');
} finally {
  if (serverProcess) {
    serverProcess.kill();
  }
}
