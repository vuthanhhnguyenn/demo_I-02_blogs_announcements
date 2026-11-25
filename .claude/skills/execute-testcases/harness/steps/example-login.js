// Usage (from the harness dir):
//   TC_ROLE=headquarter TC_SLOT=1 node run-steps.js steps/example-login.js storage-hq.json
//
// Accounts come from ../accounts.js — a per-role test pool (test_<role>_1..3) plus the
// shared one-per-role accounts (System only exists there). All use `Password@123`.
// Cognito keeps max 3 sessions per account: give each concurrent sub-agent its own slot.
//
// These are live shared accounts: never change their password, never deactivate them,
// and run any wrong-password / lockout case last (Cognito locks for ~15 minutes).
const { loginSteps } = require('../helpers');
const { account } = require('../accounts');
const { email, password } = account(
  process.env.TC_ROLE || 'headquarter',
  Number(process.env.TC_SLOT || 1),
);
module.exports = loginSteps(email, password);
