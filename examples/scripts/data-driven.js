// Data-driven testing with iterations
// Use with a suite: config.iterations = N, and a CSV/JSON data file

// Pre-request script: read iteration data
const row = pm.iterationData.toObject();
pm.variables.set('input', row.input);
pm.variables.set('expectedStatus', parseInt(row.expectedStatus));
pm.variables.set('expectedName', row.expectedName);

// Post-response script: assert based on iteration data
pm.test('status is ' + pm.variables.get('expectedStatus'), () => {
  pm.response.to.have.status(pm.variables.get('expectedStatus'));
});

if (pm.variables.get('expectedName')) {
  pm.test('name matches', () => {
    pm.expect(pm.response.json().name).to.equal(pm.variables.get('expectedName'));
  });
}

// Edge case: null/empty handling
if (row.input === '') {
  pm.test('empty input returns 400', () => {
    pm.response.to.have.status(400);
  });
}

// CSV format:
// input,expectedStatus,expectedName
// valid-user,201,Alice
// missing-email,400,
// empty-name,400,