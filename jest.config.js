module.exports = {
  preset: 'ts-jest',
  testTimeout: process.env.CI ? 30000 : 10000,
  globalSetup: './scripts/jestGlobalSetup.js',
  globalTeardown: './scripts/jestGlobalTeardown.js',
  testEnvironment: './scripts/jestEnv.js',
  setupFilesAfterEnv: ['./scripts/jestPerTestSetup.ts'],
}
