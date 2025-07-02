module.exports = {
  // Test environment
  testEnvironment: 'node',

  // TypeScript support
  preset: 'ts-jest',

  // Root directory for tests
  rootDir: './src',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],

  // File extensions to consider
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Transform files
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '../coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/*.test.ts',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/types/**',
    '!index.ts' // Exclude main entry point
  ],

  // Setup files
  setupFilesAfterEnv: [],

  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@controllers/(.*)$': '<rootDir>/controllers/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@types/(.*)$': '<rootDir>/types/$1',
    '^@core/(.*)$': '<rootDir>/core/$1'
  },

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout (30 seconds)
  testTimeout: 30000,

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,

  // Error handling
  errorOnDeprecated: true,

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/data/'
  ],

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'report.html',
        expand: true
      }
    ]
  ],

  // Mock configuration
  automock: false,
  unmockedModulePathPatterns: [
    'node_modules'
  ],

  // Snapshot configuration
  snapshotSerializers: [],

  // Module directories
  moduleDirectories: [
    'node_modules',
    'src'
  ],

  // Bail configuration (stop after first test failure)
  bail: false,

  // Force exit after tests complete
  forceExit: false,

  // Detect open handles
  detectOpenHandles: true,

  // Detect leaked timers
  detectLeaks: false,

  // Maximum worker processes
  maxWorkers: '50%',

  // Cache directory
  cacheDirectory: '../.jest-cache',

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|inquirer|figlet|gradient-string|nanospinner|boxen|cli-table3|ora|winston|pdfkit|csv-writer|date-fns|commander|cli-progress|terminal-link)/)'
  ],

  // Global variables available in tests
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'ES6',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      }
    }
  },

  // Test result processor
  testResultsProcessor: undefined,

  // Custom resolver
  resolver: undefined,

  // Notify mode
  notify: false,
  notifyMode: 'failure-change',

  // Silent mode
  silent: false,

  // Log heap usage
  logHeapUsage: false,

  // Randomize test order
  randomize: false
};