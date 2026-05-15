/** Public reviewer label — never expose email on unauthenticated review listings. */
function publicReviewUser(user) {
  const name = user.username?.trim()
  return {
    id: user.id,
    displayName: name || `Camper ${user.id}`,
  }
}

module.exports = { publicReviewUser }
