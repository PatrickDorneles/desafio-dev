import { Module } from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';

/**
 * Entity-per-module (ADR-0004): owns the `users` schema + repository and
 * exports the repository so consumer modules (e.g. `auth`) can inject it.
 */
@Module({
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
