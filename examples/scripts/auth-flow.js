// Auth flow: login → extract token → use in subsequent requests
// Place in: collection scripts/pre-request.js or request scripts/pre-request.js

// Pre-request: generate a dynamic email for registration
const timestamp = Date.now();
pm.variables.set('testEmail', `user_${timestamp}@example.com`);
pm.variables.set('testPassword', 'TestPass123!');

// Post-response (login endpoint): extract and store the auth token
// pm.test('Login returns 200', () => pm.response.to.have.status(200));
const json = pm.response.json();
pm.environment.set('authToken', json.token);
pm.environment.set('userId', json.user.id);

// Subsequent requests use {{authToken}} in headers:
// Authorization: Bearer {{authToken}}