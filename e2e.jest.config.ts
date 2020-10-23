import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  moduleFileExtensions: ['ts', 'js'],
  modulePaths: ['<rootDir>', '<rootDir>/src'],
  roots: ['<rootDir>', '<rootDir>/src'],
  setupFiles: ['dotenv/config'],
  globalSetup: '<rootDir>/e2e/setup.ts',
  globalTeardown: '<rootDir>/e2e/teardown.ts',
  testPathIgnorePatterns: ['<rootDir>/build', '<rootDir>/client'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  }
}
export default config
