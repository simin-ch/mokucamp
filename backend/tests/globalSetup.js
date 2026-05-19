const { execFileSync } = require('child_process')
const path = require('path')
const { getTestDatabaseUrl } = require('./testDatabaseUrl')

module.exports = async function globalSetup() {
  const root = path.join(__dirname, '..')
  const env = { ...process.env, DATABASE_URL: getTestDatabaseUrl() }
  execFileSync('npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
    cwd: root,
    stdio: 'inherit',
    env,
  })
}
