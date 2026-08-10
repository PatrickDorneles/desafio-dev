/**
 * bcrypt cost factor (Spec 001 / ADR-0002: cost 10–12).
 */
export const BCRYPT_SALT_ROUNDS = 12;

/**
 * Precomputed bcrypt hash (cost 12) of a throwaway string, used by the login
 * flow to keep response timing constant when the email is unknown (CA-004):
 * we always run `bcrypt.compare`, against the real hash or this dummy one.
 */
export const DUMMY_HASH =
  '$2b$12$bfC7qviVsolYu5F0Mvp2secjxFGL6aEIZ9mMjcYhzJ1Kh9tZf4wci';
