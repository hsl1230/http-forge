module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/?(*.)+(spec|test).(ts|tsx|js)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    '^vscode$': '<rootDir>/__mocks__/vscode.ts',
    // uuid v13+ is ESM-only (no CJS build); redirect every importer
    // (including the nested copy under @http-forge/core) to the CJS stub.
    '^uuid$': '<rootDir>/__mocks__/uuid.js'
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
};
