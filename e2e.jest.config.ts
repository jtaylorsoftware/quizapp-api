import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  moduleFileExtensions: ['ts', 'js'],
  modulePaths: ['<rootDir>', '<rootDir>/src'],
  roots: ['<rootDir>', '<rootDir>/src'],
  setupFiles: ['dotenv/config'],
  testPathIgnorePatterns: ['<rootDir>/build', '<rootDir>/client'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  }
}
export default config
