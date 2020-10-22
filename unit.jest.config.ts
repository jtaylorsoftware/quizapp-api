import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  moduleFileExtensions: ['ts', 'js'],
  testPathIgnorePatterns: [
    '<rootDir>/build',
    '<rootDir>/client',
    '<rootDir>/e2e'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  }
}
export default config
