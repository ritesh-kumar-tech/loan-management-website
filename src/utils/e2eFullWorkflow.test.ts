import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';

const PORT = 3009;
const baseUrl = `http://127.0.0.1:${PORT}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (path: string, options: RequestInit = {}) => {
  // `headers` must be merged AFTER spreading `options`, not before - otherwise
  // `...options` (which itself carries a `headers` key whenever a caller passes
  // one, e.g. an Authorization header) clobbers the Content-Type set here, the
  // JSON body parser never kicks in server-side, and every field silently comes
  // through as undefined.
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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

async function runE2ETest() {
  console.log('=== STARTING COMPLETE END-TO-END WORKFLOW VERIFICATION ===');
  let serverProcess: ChildProcess | null = null;

  try {
    serverProcess = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsx', 'server.ts'], {
      cwd: process.cwd(),
      stdio: 'ignore',
      shell: true,
      env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    });

    const ready = await waitForServer();
    assert.equal(ready, true, 'Test server started successfully on port 3009');

    // 0. Admin Login (required for every admin-only action exercised below)
    const adminLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@dhanifinance.in', password: 'password123' }),
    });
    assert.equal(adminLoginRes.response.status, 200, 'Admin login succeeds');
    const adminAuth = { Authorization: `Bearer ${adminLoginRes.body.token}` };
    console.log('[PASS] Step 0: Admin authenticated for the workflow');

    // 1. Submit Application
    const newAppPayload = {
      userId: 'usr_e2e_customer',
      productId: 'prod_personal',
      productType: 'personal',
      productTitle: 'Personal Loan',
      requestedAmount: 500000,
      requestedTenureMonths: 36,
      purpose: 'Home Renovation',
      status: 'submitted',
      personalInfo: {
        fullName: 'Vikram Sharma',
        fatherOrSpouseName: 'Rajesh Sharma',
        dob: '1992-05-15',
        gender: 'male',
        maritalStatus: 'married',
        nationality: 'Indian',
        email: 'vikram.sharma@example.com',
        mobile: '9876501234',
        panNumber: 'ABCDE1234F',
        aadhaarLast4: '5678',
        currentAddress: '402 Sunrise Apartments, MG Road, Bengaluru',
        permanentAddress: '402 Sunrise Apartments, MG Road, Bengaluru',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        residenceType: 'owned',
      },
      employmentInfo: {
        employmentType: 'salaried',
        companyOrBizName: 'TechCorp Pvt Ltd',
        designationOrBizType: 'Senior Software Engineer',
        monthlyIncome: 120000,
        workExperienceYears: 6,
        officeAddress: 'Tech Park, Whitefield, Bengaluru',
        salaryBankName: 'HDFC Bank',
      },
      financialInfo: {
        monthlyIncome: 120000,
        additionalIncome: 0,
        existingEmis: 15000,
        monthlyExpenses: 40000,
        bankName: 'HDFC Bank',
        accountNumber: '50100234567890',
        ifscCode: 'HDFC0001234',
        accountHolderName: 'Vikram Sharma',
        preferredEmiDay: 5,
      },
      documents: [
        { id: 'doc_1', docType: 'pan_card', title: 'PAN Card', fileName: 'pan_vikram.pdf', fileUrl: 'blob:pdf', uploadedAt: new Date().toISOString(), status: 'pending' },
        { id: 'doc_2', docType: 'aadhaar_card', title: 'Aadhaar Card', fileName: 'aadhaar_vikram.pdf', fileUrl: 'blob:pdf', uploadedAt: new Date().toISOString(), status: 'pending' },
        { id: 'doc_3', docType: 'salary_proof', title: 'Salary Proof', fileName: 'payslip_vikram.pdf', fileUrl: 'blob:pdf', uploadedAt: new Date().toISOString(), status: 'pending' },
        { id: 'doc_4', docType: 'bank_statement', title: 'Bank Statement', fileName: 'statement_vikram.pdf', fileUrl: 'blob:pdf', uploadedAt: new Date().toISOString(), status: 'pending' },
      ],
    };

    const appRes = await request('/api/applications', {
      method: 'POST',
      body: JSON.stringify(newAppPayload),
    });

    assert.equal(appRes.response.status, 200, 'Application creation endpoint returns 200');
    assert.ok(appRes.body.application?.id, 'Application ID is generated');
    const appId = appRes.body.application.id;
    console.log(`[PASS] Step 1: Application Created successfully: ${appId}`);

    // 2. Track Status Lookup (By Application ID)
    const trackIdRes = await request('/api/applications/track', {
      method: 'POST',
      body: JSON.stringify({ identifier: appId }),
    });
    assert.equal(trackIdRes.response.status, 200, 'Track status by App ID returns 200');
    assert.equal(trackIdRes.body.requiresOtp, false, 'Track status does not require OTP');
    assert.equal(trackIdRes.body.application.id, appId, 'Application ID lookup returns full application');
    console.log('[PASS] Step 2: Lookup by Application ID succeeded');

    // 3. Track Status Lookup (By Mobile Number with formatting)
    const trackMobileRes = await request('/api/applications/track', {
      method: 'POST',
      body: JSON.stringify({ identifier: '+91 98765 01234' }),
    });
    assert.equal(trackMobileRes.response.status, 200, 'Track status by normalized mobile returns 200');
    assert.equal(trackMobileRes.body.application.id, appId, 'Mobile lookup resolves correct Application ID');
    console.log('[PASS] Step 3: Mobile number lookup (+91 98765 01234) succeeded');

    // 4. Track Status Rejects Email Lookup
    const trackEmailRes = await request('/api/applications/track', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'vikram.sharma@example.com' }),
    });
    assert.equal(trackEmailRes.response.status, 400, 'Track status rejects email lookup');
    console.log('[PASS] Step 4: Email lookup rejected as expected');

    // 5. Admin Document Verification
    for (const docId of ['doc_1', 'doc_2', 'doc_3', 'doc_4']) {
      const docVerifyRes = await request('/api/documents/verify', {
        method: 'POST',
        headers: adminAuth,
        body: JSON.stringify({ applicationId: appId, documentId: docId, status: 'verified' }),
      });
      assert.equal(docVerifyRes.response.status, 200, `Document ${docId} verified`);
    }
    console.log('[PASS] Step 5: All mandatory documents marked VERIFIED');

    // 6. Admin Request Processing Fee
    const reqFeeRes = await request(`/api/applications/${appId}/request-processing-fee`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ feeAmount: 2000 }),
    });
    assert.equal(reqFeeRes.response.status, 200, 'Processing fee request returns 200');
    assert.equal(reqFeeRes.body.application.status, 'processing_fee_pending', 'Application status is processing_fee_pending');
    assert.equal(reqFeeRes.body.application.processingFee, 2000, 'Processing fee amount set to 2000');
    console.log('[PASS] Step 6: Admin requested processing fee of ₹2,000');

    // 7. Customer Pays Processing Fee via UPI
    // UTRs must be unique per run - this script is re-run against a persistent
    // database (not reset between runs), and the backend correctly rejects a
    // UTR it has already seen, so a hardcoded value here would only work once.
    const runSuffix = Math.random().toString().slice(2, 8);
    const feeUtr = `UTR9988776${runSuffix}`;
    const feePaymentRes = await request('/api/payments/submit', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: appId,
        userId: 'usr_e2e_customer',
        customerName: 'Vikram Sharma',
        amount: 2000,
        purpose: 'processing_fee',
        utrNumber: feeUtr,
        proofScreenshotUrl: 'blob:proof',
      }),
    });
    assert.equal(feePaymentRes.response.status, 200, 'Processing fee payment submission returns 200');
    assert.ok(feePaymentRes.body.payment?.id, 'Payment record generated');
    const feePayId = feePaymentRes.body.payment.id;
    console.log(`[PASS] Step 7: Customer submitted processing fee payment with ${feeUtr}`);

    // 8. Admin Verifies Processing Fee Payment
    const verifyFeePayRes = await request(`/api/payments/${feePayId}/verify`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ action: 'approve', note: 'Processing fee verified with HDFC statement' }),
    });
    assert.equal(verifyFeePayRes.response.status, 200, 'Processing fee payment verification returns 200');
    console.log('[PASS] Step 8: Admin verified processing fee payment');

    // 9. Admin Performs Final Loan Approval
    const finalApproveRes = await request(`/api/applications/${appId}/status`, {
      method: 'PATCH',
      headers: adminAuth,
      body: JSON.stringify({
        status: 'approved',
        approvedAmount: 500000,
        approvedRate: 11.5,
        approvedTenureMonths: 36,
        note: 'Loan approved by Credit Manager',
      }),
    });
    assert.equal(finalApproveRes.response.status, 200, 'Final loan approval returns 200');
    assert.equal(finalApproveRes.body.application.status, 'approved', 'Status is approved');
    console.log('[PASS] Step 9: Admin performed final loan approval');

    // 10. Customer Tracks Approved Loan Portal & EMI Schedule
    const postApprovalRes = await request('/api/applications/track', {
      method: 'POST',
      body: JSON.stringify({ identifier: appId }),
    });
    assert.equal(postApprovalRes.body.application.status, 'approved', 'Customer portal reflects approved status');
    assert.ok(postApprovalRes.body.loanAccount?.accountNumber, 'Loan Account generated for customer');
    const loanAccountNo = postApprovalRes.body.loanAccount.accountNumber;
    console.log(`[PASS] Step 10: Customer portal displays approved loan account: ${loanAccountNo}`);

    // 11. Customer Submits EMI Installment #1 Payment
    const emiPayRes = await request('/api/payments/submit', {
      method: 'POST',
      body: JSON.stringify({
        loanAccountId: loanAccountNo,
        applicationId: appId,
        userId: 'usr_e2e_customer',
        customerName: 'Vikram Sharma',
        amount: postApprovalRes.body.loanAccount.monthlyEmi,
        purpose: 'emi',
        installmentNumber: 1,
        utrNumber: `UTR1122334${runSuffix}`,
      }),
    });
    assert.equal(emiPayRes.response.status, 200, 'EMI payment submission returns 200');
    const emiPayId = emiPayRes.body.payment.id;
    console.log('[PASS] Step 11: Customer submitted EMI Installment #1 payment');

    // 12. Admin Verifies EMI Payment & Receipt Generation
    const verifyEmiRes = await request(`/api/payments/${emiPayId}/verify`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ action: 'approve', note: 'EMI #1 payment verified' }),
    });
    assert.equal(verifyEmiRes.response.status, 200, 'EMI payment verification returns 200');
    assert.ok(verifyEmiRes.body.payment.receiptNumber, 'Official receipt RCT-2026 generated');
    console.log(`[PASS] Step 12: Admin verified EMI payment. Receipt created: ${verifyEmiRes.body.payment.receiptNumber}`);

    console.log('=== ALL 12 END-TO-END WORKFLOW STEPS PASSED PERFECTLY! ===');
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runE2ETest().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
