/**
 * Sample books and community books are numbered separately, so a community book
 * can share a number with a sample book. Community books therefore live under
 * /book/w<id> and /reader/w<id>; sample books keep their plain number.
 */
export function communityRouteId(id: string | number) {
  return `w${id}`
}

/** Splits a route id into the book it names. Plain numbers that are not sample books are treated as community books, so older links keep working. */
export function parseBookRoute(routeId: string, isSample: (id: number) => boolean): { kind: 'sample' | 'community'; id: string } | null {
  const community = /^w(\d+)$/.exec(routeId)
  if (community) return { kind: 'community', id: community[1] }
  if (!/^\d+$/.test(routeId)) return null
  return isSample(Number(routeId)) ? { kind: 'sample', id: routeId } : { kind: 'community', id: routeId }
}
