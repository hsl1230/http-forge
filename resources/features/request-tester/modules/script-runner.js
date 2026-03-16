/**
 * HTTP Tester Core - Script Templates
 * Provides default script templates for the script editor
 * 
 * NOTE: Script execution is now handled by the backend (extension side) using vm2 sandbox
 * This module only provides UI templates for the script editor
 */

/**
 * Get default pre-request script template
 * @returns {string}
 */
function getDefaultPreRequestScript() {
    return `// Pre-request script - runs before the request is sent (on backend)
// Available: agl.request, agl.env, agl.variables, agl.cookies

// Example: Add dynamic header
// agl.request.setHeader('X-Request-Time', Date.now().toString());

// Example: Use environment variable
// const apiKey = agl.env.get('apiKey');
// agl.request.setHeader('Authorization', 'Bearer ' + apiKey);

// Example: Set request body
// agl.request.setBody({ timestamp: Date.now() });

console.log('Pre-request script executed');
`;
}

/**
 * Get default post-response script template
 * @returns {string}
 */
function getDefaultPostResponseScript() {
    return `// Post-response script - runs after the response is received (on backend)
// Available: agl.request, agl.response, agl.env, agl.test(), agl.expect()

// Example: Log response info
// console.log('Status:', agl.response.status);
// console.log('Response time:', agl.response.time, 'ms');

// Example: Write tests
// agl.test('Status is 200', () => {
//     agl.expect(agl.response.status).to.equal(200);
// });

// agl.test('Response has data', () => {
//     agl.expect(agl.response.json()).to.have.property('data');
// });

// Example: Save token from response
// const token = agl.response.json().token;
// agl.env.set('authToken', token);

console.log('Post-response script executed');
`;
}

// ES Module export
export { getDefaultPostResponseScript, getDefaultPreRequestScript };


