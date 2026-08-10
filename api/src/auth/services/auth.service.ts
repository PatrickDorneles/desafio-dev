import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  BCRYPT_SALT_ROUNDS,
  DUMMY_HASH,
} from '../../common/constants/auth.constants';
import { UserRow } from '../../users/entities/users.entity';
import { UsersRepository } from '../../users/repositories/users.repository';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  user: UserProfile;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register({
    name,
    email,
    password,
  }: RegisterInput): Promise<UserProfile> {
    // Email is already normalized by the DTO; normalize defensively (FR-010).
    const normalizedEmail = email.trim().toLowerCase();

    // Pre-check avoids a wasted bcrypt hash on duplicates (FR-011); the DB
    // unique constraint still guards the concurrent race below.
    const existing = this.usersRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    try {
      const user = this.usersRepository.create({
        name,
        email: normalizedEmail,
        passwordHash,
      });
      return this.toProfile(user);
    } catch (error) {
      // DB-level uniqueness (FR-011): simultaneous duplicate registrations → 409.
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login({ email, password }: LoginInput): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.usersRepository.findByEmail(normalizedEmail);

    // Always run bcrypt.compare — against the real hash or a dummy one for
    // unknown emails — so response timing does not reveal whether the email
    // exists (CA-004). Same generic message either way.
    const passwordMatches = await bcrypt.compare(
      password,
      user ? user.passwordHash : DUMMY_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // ADR-0002: no sensitive data in the token — `sub` only.
    const accessToken = await this.jwtService.signAsync({ sub: user.id });

    return { accessToken, user: this.toProfile(user) };
  }

  getProfile(userId: string): UserProfile {
    const user = this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toProfile(user);
  }

  /** Never expose `passwordHash` (SC-001). */
  private toProfile(user: UserRow): UserProfile {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE'
    );
  }
}
