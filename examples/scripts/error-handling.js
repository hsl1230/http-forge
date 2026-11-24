// Error handling assertions — test 400/401/403/404 responses
// Place in: request scripts/post-response.js

// --- 400 Bad Request ---
pm.test('Status is 400', () => pm.response.to.have.status(400));
pm.test('Error has message field', () => {
  const json = pm.response.json();
  pm.expect(json).to.have.property('error');
  pm.expect(json.error).to.include('email');
});
pm.test('Content-Type is JSON', () => pm.response.to.have.header('Content-Type', /application\/json/));

// --- 401 Unauthorized ---
pm.test('Status is 401', () => pm.response.to.have.status(401));
pm.test('Has WWW-Authenticate header', () => pm.response.to.have.header('WWW-Authenticate'));
pm.test('Error message mentions token', () => {
  pm.expect(pm.response.json().message).to.include('token');
});

// --- 403 Forbidden ---
pm.test('Status is 403', () => pm.response.to.have.status(403));
pm.test('Error mentions permission', () => {
  pm.expect(pm.response.json().error).to.include('permission');
});

// --- 404 Not Found ---
pm.test('Status is 404', () => pm.response.to.have.status(404));
pm.test('Error message includes resource', () => {
  pm.expect(pm.response.json().message).to.include('not found');
});

// --- Response time SLA ---
pm.test('Response time < 500ms', () => {
  pm.expect(pm.response.responseTime).to.be.below(500);
});