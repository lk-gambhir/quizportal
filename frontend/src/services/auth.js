// Login, registration and password reset, using Cognito's API directly with fetch.
// The password goes straight to Cognito over HTTPS; our backend never sees it.
const REGION = import.meta.env.VITE_REGION;
const CLIENT_ID = import.meta.env.VITE_USER_POOL_CLIENT_ID;
const TOKEN_KEY = 'idToken';

// Every Cognito call is a POST with the action name in a header.
async function cognito(action, body) {
  const res = await fetch(`https://cognito-idp.${REGION}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify({ ClientId: CLIENT_ID, ...body }),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message ?? 'Something went wrong');
    error.code = data.__type; // e.g. "UserNotConfirmedException"
    throw error;
  }
  return data;
}

// ---------- Registration ----------

export function register({ name, rollNo, email, password }) {
  return cognito('SignUp', {
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name },
      { Name: 'custom:rollNo', Value: rollNo },
    ],
  });
}

export function confirmRegistration(email, code) {
  return cognito('ConfirmSignUp', { Username: email, ConfirmationCode: code });
}

export function resendCode(email) {
  return cognito('ResendConfirmationCode', { Username: email });
}

// ---------- Login ----------

// Returns { user } when logged in, or { newPasswordSession } when an admin
// created by script must choose a new password first.
export async function login(email, password) {
  const data = await cognito('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: email, PASSWORD: password },
  });
  if (data.ChallengeName === 'NEW_PASSWORD_REQUIRED') return { newPasswordSession: data.Session };
  localStorage.setItem(TOKEN_KEY, data.AuthenticationResult.IdToken);
  return { user: getUser() };
}

export async function setNewPassword(email, newPassword, session) {
  const data = await cognito('RespondToAuthChallenge', {
    ChallengeName: 'NEW_PASSWORD_REQUIRED',
    Session: session,
    ChallengeResponses: { USERNAME: email, NEW_PASSWORD: newPassword },
  });
  localStorage.setItem(TOKEN_KEY, data.AuthenticationResult.IdToken);
  return { user: getUser() };
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------- Forgot password ----------

export function forgotPassword(email) {
  return cognito('ForgotPassword', { Username: email });
}

export function resetPassword(email, code, newPassword) {
  return cognito('ConfirmForgotPassword', { Username: email, ConfirmationCode: code, Password: newPassword });
}

// ---------- Current user ----------

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Reads the user from the ID token. Returns null if logged out or the token has expired.
// The backend never trusts this: API Gateway verifies the token's signature on every request.
export function getUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)); // TextDecoder handles non-English names
    if (claims.exp * 1000 < Date.now()) {
      logout();
      return null;
    }
    return {
      name: claims.name,
      email: claims.email,
      rollNo: claims['custom:rollNo'],
      isAdmin: (claims['cognito:groups'] ?? []).includes('Admin'),
    };
  } catch {
    logout();
    return null;
  }
}
