import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import {
  BCRYPT_SALT_ROUNDS,
  DUMMY_HASH,
} from '../../common/constants/auth.constants';
import { UserRow } from '../entities/users.entity';
import { UsersRepository } from '../repositories/users.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<
    Pick<UsersRepository, 'findByEmail' | 'findById' | 'create'>
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  const userRow: UserRow = {
    id: 'uuid-1',
    name: 'Maria Silva',
    email: 'maria@example.com',
    passwordHash: 'hashed-password',
    createdAt: 1780000000000,
    updatedAt: 1780000000000,
  };

  beforeEach(async () => {
    usersRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses bcrypt cost 12 (ADR-0002)', () => {
    expect(BCRYPT_SALT_ROUNDS).toBe(12);
  });

  describe('register', () => {
    it('hashes with bcrypt cost 12, normalizes email, and returns profile without passwordHash', async () => {
      const hashSpy = jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('hashed-password' as never);
      usersRepository.create.mockReturnValue(userRow);

      const result = await service.register({
        name: 'Maria Silva',
        email: '  MARIA@Example.COM ',
        password: 'senha-forte-123',
      });

      expect(hashSpy).toHaveBeenCalledWith(
        'senha-forte-123',
        BCRYPT_SALT_ROUNDS,
      );
      expect(usersRepository.create).toHaveBeenCalledWith({
        name: 'Maria Silva',
        email: 'maria@example.com',
        passwordHash: 'hashed-password',
      });
      expect(result).toEqual({
        id: 'uuid-1',
        name: 'Maria Silva',
        email: 'maria@example.com',
        createdAt: 1780000000000,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('pre-checks findByEmail and skips hashing on duplicates (FR-011)', async () => {
      usersRepository.findByEmail.mockReturnValue(userRow);
      const hashSpy = jest.spyOn(bcrypt, 'hash');

      await expect(
        service.register({
          name: 'Maria Silva',
          email: 'maria@example.com',
          password: 'senha-forte-123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(hashSpy).not.toHaveBeenCalled();
      expect(usersRepository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException (409) on duplicate email (SQLITE_CONSTRAINT_UNIQUE)', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
      const error = new Error('UNIQUE constraint failed: users.email');
      (error as { code?: string }).code = 'SQLITE_CONSTRAINT_UNIQUE';
      usersRepository.create.mockImplementation(() => {
        throw error;
      });

      await expect(
        service.register({
          name: 'Maria Silva',
          email: 'maria@example.com',
          password: 'senha-forte-123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('re-throws non-unique errors', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
      const error = new Error('disk I/O error');
      usersRepository.create.mockImplementation(() => {
        throw error;
      });

      await expect(
        service.register({
          name: 'Maria Silva',
          email: 'maria@example.com',
          password: 'senha-forte-123',
        }),
      ).rejects.toBe(error);
    });
  });

  describe('login', () => {
    it('returns accessToken and profile on valid credentials', async () => {
      usersRepository.findByEmail.mockReturnValue(userRow);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login({
        email: 'maria@example.com',
        password: 'senha-forte-123',
      });

      // ADR-0002: token carries `sub` only — no sensitive data.
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'uuid-1' });
      expect(result.accessToken).toBe('jwt-token');
      expect(result.user).toEqual({
        id: 'uuid-1',
        name: 'Maria Silva',
        email: 'maria@example.com',
        createdAt: 1780000000000,
      });
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('throws 401 with the SAME message for wrong password and unknown email', async () => {
      // wrong password
      usersRepository.findByEmail.mockReturnValue(userRow);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      const wrongPasswordError = await service
        .login({ email: 'maria@example.com', password: 'senha-errada' })
        .catch((e: unknown) => e);

      // unknown email
      usersRepository.findByEmail.mockReturnValue(undefined);
      const unknownEmailError = await service
        .login({ email: 'nobody@example.com', password: 'qualquer-coisa' })
        .catch((e: unknown) => e);

      expect(wrongPasswordError).toBeInstanceOf(UnauthorizedException);
      expect(unknownEmailError).toBeInstanceOf(UnauthorizedException);
      expect((wrongPasswordError as Error).message).toBe(
        (unknownEmailError as Error).message,
      );
    });

    it('runs bcrypt.compare against DUMMY_HASH for unknown emails (timing, CA-004)', async () => {
      usersRepository.findByEmail.mockReturnValue(undefined);
      const compareSpy = jest
        .spyOn(bcrypt, 'compare')
        .mockResolvedValue(false as never);

      await expect(
        service.login({
          email: 'nobody@example.com',
          password: 'qualquer-coisa',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(compareSpy).toHaveBeenCalledWith('qualquer-coisa', DUMMY_HASH);
    });
  });

  describe('getProfile', () => {
    it('returns the profile for an existing user', () => {
      usersRepository.findById.mockReturnValue(userRow);

      const result = service.getProfile('uuid-1');

      expect(result).toEqual({
        id: 'uuid-1',
        name: 'Maria Silva',
        email: 'maria@example.com',
        createdAt: 1780000000000,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws NotFoundException when the user is gone', () => {
      usersRepository.findById.mockReturnValue(undefined);

      expect(() => service.getProfile('missing')).toThrow(NotFoundException);
    });
  });
});
