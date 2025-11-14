module.exports = {
  // Use Puppeteer preset for E2E tests
  preset: 'jest-puppeteer',

  // Use custom setup for E2E tests
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.js'],

  // Only run E2E tests
  testMatch: [
    '**/tests/e2e/**/*.test.js'
  ],

  // Patterns to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/tests/unit/',
    '/tests/integration/'
  ],

  // Verbose output
  verbose: true,

  // Test timeout (E2E tests take longer)
  testTimeout: 30000,

  // Transform files
  transform: {},

  // Module name mapper for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
