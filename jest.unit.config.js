const config = require('./jest.config');
const { globalSetup, ...unit } = config;
module.exports = { ...unit, testMatch: ['**/unit/*.test.ts'] };
