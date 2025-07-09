import cookie from 'cookie'

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getTokenFromCookie = (req: any): string | undefined => {
  const parsed = cookie.parse(req.headers.cookie || '')
  const bearerToken = parsed['kc-access']

  return typeof bearerToken === 'string' ? bearerToken : undefined
}
