const jwt = require('jsonwebtoken')

/**
 * Express middleware that validates a Bearer JWT token.
 *
 * On success it attaches `req.user = { id, email }` and calls next().
 * On failure it returns 401 so protected routes stay secure.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' })
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { id: payload.sub, email: payload.email }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' })
  }
}

module.exports = authenticate
