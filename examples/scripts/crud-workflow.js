// CRUD workflow: Create → Read → Update → Delete
// Use in a Test Suite with request nodes in sequence.
// Pass IDs between steps via pm.variables or pm.environment.

// --- Step 1: Create (POST /users) ---
// Post-response script:
pm.test('Create returns 201', () => pm.response.to.have.status(201));
const created = pm.response.json();
pm.variables.set('createdId', created.id);
pm.expect(created).to.have.property('name');
pm.expect(created).to.have.property('email');

// --- Step 2: Read (GET /users/{{createdId}}) ---
// Pre-request: URL uses {{createdId}}
// Post-response script:
pm.test('Read returns 200', () => pm.response.to.have.status(200));
pm.test('Read matches created', () => {
  const json = pm.response.json();
  pm.expect(json.id).to.equal(pm.variables.get('createdId'));
  pm.expect(json.name).to.equal('Alice');
});

// --- Step 3: Update (PUT /users/{{createdId}}) ---
// Post-response script:
pm.test('Update returns 200', () => pm.response.to.have.status(200));
pm.test('Name updated', () => {
  pm.expect(pm.response.json().name).to.equal('Bob');
});

// --- Step 4: Delete (DELETE /users/{{createdId}}) ---
// Post-response script:
pm.test('Delete returns 204', () => pm.response.to.have.status(204));

// --- Step 5: Verify deleted (GET /users/{{createdId}} expects 404) ---
// Post-response script:
pm.test('Deleted user not found', () => pm.response.to.have.status(404));