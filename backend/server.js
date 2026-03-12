const dotenv = require('dotenv')
const app = require('./src/app')

dotenv.config()

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend server listening on port ${PORT}`)
})

