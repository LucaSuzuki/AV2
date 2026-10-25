module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true, module: 'CommonJS', target: 'ES2022', esModuleInterop: true }, diagnostics: false }],
  },
  transformIgnorePatterns: ['/node_modules/(?!(content-disposition|cookie)/)'],
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  globalSetup: '<rootDir>/tests/setup/globalSetup.ts',
  testTimeout: 30000,
};
