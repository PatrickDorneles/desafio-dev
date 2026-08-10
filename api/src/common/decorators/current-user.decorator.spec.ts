import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

describe('CurrentUser decorator', () => {
  class TestController {
    handler(@CurrentUser() user: unknown): unknown {
      return user;
    }
  }

  function getFactory(): (data: unknown, ctx: ExecutionContext) => unknown {
    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestController,
      'handler',
    ) as Record<
      string,
      { factory: (data: unknown, ctx: ExecutionContext) => unknown }
    >;
    const key = Object.keys(metadata)[0];
    return metadata[key].factory;
  }

  it('returns request.user', () => {
    const user = { sub: 'uuid-1' };
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;

    const result = getFactory()(undefined, context);
    expect(result).toEqual(user);
  });
});
