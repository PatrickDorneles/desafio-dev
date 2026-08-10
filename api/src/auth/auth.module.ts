import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { UsersModule } from '../users/users.module';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Fail fast at boot (ADR-0002: no insecure default). A missing/short
        // secret or missing expiry must never reach the first login attempt.
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret || secret.length < 16) {
          throw new Error('JWT_SECRET is required (min 16 chars)');
        }
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN');
        if (!expiresIn) {
          throw new Error('JWT_EXPIRES_IN is required');
        }
        return {
          secret,
          signOptions: {
            algorithm: 'HS256',
            expiresIn,
          } as SignOptions,
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
