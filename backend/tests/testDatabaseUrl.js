const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

/**
 * Postgres URL for Jest (Neon test branch or local). Prefer TEST_DATABASE_URL so
 * dev/prod DATABASE_URL is not required for tests.
 */
function getTestDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
  if (!url || (!url.startsWith('postgresql://') && !url.startsWith('postgres://'))) {
    throw new Error(
      'Set TEST_DATABASE_URL in backend/.env to your Neon test branch direct connection string ' +
        '(postgresql://...). See .env.example.',
    )
  }
  return url
}

module.exports = { getTestDatabaseUrl }
