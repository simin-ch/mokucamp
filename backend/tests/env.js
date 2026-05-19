const { getTestDatabaseUrl } = require('./testDatabaseUrl')

process.env.DATABASE_URL = getTestDatabaseUrl()
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-jest'
process.env.NODE_ENV = 'test'
