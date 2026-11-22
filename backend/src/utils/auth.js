// Reads the logged-in user from the request.
// API Gateway has already verified the Cognito ID token, so these claims can be trusted.
export function getUser(event) {
  const claims = event.requestContext?.authorizer?.claims ?? {};
  // Groups can arrive as "Admin", "Admin,Other" or "[Admin Other]", so split on any of those.
  const groups = String(claims['cognito:groups'] ?? '').replace(/[[\]]/g, '').split(/[\s,]+/);
  return {
    sub: claims.sub, // the user's unique ID
    email: claims.email,
    name: claims.name,
    rollNo: claims['custom:rollNo'],
    isAdmin: groups.includes('Admin'),
  };
}
