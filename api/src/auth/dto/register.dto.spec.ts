import { registerSchema } from './register.dto';

describe('registerSchema (Spec 001, §9)', () => {
  const valid = {
    name: 'Maria Silva',
    email: 'maria@example.com',
    password: 'senha-forte-123',
  };

  it('accepts a valid payload', () => {
    const result = registerSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  describe('password', () => {
    it('rejects a password longer than 72 bytes (FR-012, bcrypt limit)', () => {
      const result = registerSchema.safeParse({
        ...valid,
        password: 'a'.repeat(73),
      });
      expect(result.success).toBe(false);
    });

    it('accepts a password of exactly 72 bytes', () => {
      const result = registerSchema.safeParse({
        ...valid,
        password: 'a'.repeat(72),
      });
      expect(result.success).toBe(true);
    });

    it('rejects a password shorter than 8 chars', () => {
      const result = registerSchema.safeParse({
        ...valid,
        password: 'short',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('email', () => {
    it('normalizes email (trim + lowercase) (FR-010)', () => {
      const result = registerSchema.safeParse({
        ...valid,
        email: '  MARIA@Example.COM ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('maria@example.com');
      }
    });

    it('rejects an invalid email', () => {
      const result = registerSchema.safeParse({
        ...valid,
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('name', () => {
    it('rejects an empty name', () => {
      const result = registerSchema.safeParse({ ...valid, name: '' });
      expect(result.success).toBe(false);
    });

    it('rejects a name longer than 100 chars', () => {
      const result = registerSchema.safeParse({
        ...valid,
        name: 'x'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('accepts a 100-char name', () => {
      const result = registerSchema.safeParse({
        ...valid,
        name: 'x'.repeat(100),
      });
      expect(result.success).toBe(true);
    });
  });
});
