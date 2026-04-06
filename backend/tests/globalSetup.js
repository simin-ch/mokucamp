const { execFileSync } = require('child_process')
const path = require('path')

module.exports = async function globalSetup() {
  const root = path.join(__dirname, '..')
  const dbFile = path.join(root, 'prisma', 'test-integration.db')
  const env = { ...process.env, DATABASE_URL: `file:${dbFile}` }
  execFileSync('npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
    cwd: root,
    stdio: 'inherit',
    env,
  })
}
