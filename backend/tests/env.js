const path = require('path')

const dbFile = path.join(__dirname, '..', 'prisma', 'test-integration.db')
process.env.DATABASE_URL = `file:${dbFile}`
