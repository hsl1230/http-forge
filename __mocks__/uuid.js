// Jest module mapper target for 'uuid' (see jest.config.js).
//
// uuid v13+ ships ESM only (no CJS build) and this suite runs as CJS under
// ts-jest, so neither the top-level copy nor the nested copy under
// @http-forge/core can be required here. Tests assert command wiring and
// never generate ids — a deterministic stub keeps the suite hermetic.
module.exports = {
  v4: () => 'mock-uuid-v4',
};
