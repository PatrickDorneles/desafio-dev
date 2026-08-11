/**
 * Authenticated user attached to `request.user` by JwtAuthGuard — the actual
 * DB user (never the password hash). The JWT payload (`JwtUser`) only carries
 * `sub`; the guard resolves the full user from the DB before authorizing.
 */
export interface CurrentUserPayload {
  id: string;
  name: string;
  email: string;
}
