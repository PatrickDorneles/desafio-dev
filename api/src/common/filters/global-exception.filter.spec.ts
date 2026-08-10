import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { RegisterDto } from '../../auth/dto/register.dto';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  const bodyMetadata: ArgumentMetadata = {
    type: 'body',
    metatype: RegisterDto,
  };

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  function mockHost() {
    const send = jest.fn<(body: unknown) => void, [body: unknown]>();
    const status = jest.fn().mockReturnValue({ send });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    };
    return { send, status, host };
  }

  it('passes through an array `message` from the HttpException response verbatim', () => {
    const exception = new BadRequestException({
      statusCode: 400,
      message: ['Name is required', 'Invalid email'],
      error: 'Bad Request',
    });
    const { send, host } = mockHost();

    filter.catch(
      exception,
      host as Parameters<GlobalExceptionFilter['catch']>[1],
    );

    expect(send).toHaveBeenCalledWith({
      statusCode: 400,
      message: ['Name is required', 'Invalid email'],
      error: 'Bad Request',
    });
  });

  it('passes through a string `message` from the HttpException response', () => {
    const exception = new BadRequestException('Invalid credentials');
    const { send, host } = mockHost();

    filter.catch(
      exception,
      host as Parameters<GlobalExceptionFilter['catch']>[1],
    );

    expect(send).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Invalid credentials',
      error: 'Bad Request',
    });
  });

  it('falls back to exception.message when the response has no `message` property', () => {
    const exception = new BadRequestException('fallback message');
    // Force a response body without a `message` property.
    jest.spyOn(exception, 'getResponse').mockReturnValue({ statusCode: 400 });
    const { send, host } = mockHost();

    filter.catch(
      exception,
      host as Parameters<GlobalExceptionFilter['catch']>[1],
    );

    expect(send).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'fallback message',
      error: 'BadRequestException',
    });
  });

  it('keeps the 500 envelope for non-HttpException errors', () => {
    const { send, host } = mockHost();

    filter.catch(
      new Error('boom'),
      host as Parameters<GlobalExceptionFilter['catch']>[1],
    );

    expect(send).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  });

  describe('with the ZodValidationPipe (Spec §10: 400 validation → array message)', () => {
    it('throws a BadRequestException whose response message is an array', async () => {
      const pipe = new ZodValidationPipe();
      const invalid = { name: '', email: 'not-an-email', password: 'short' };

      let thrown: unknown;
      try {
        await pipe.transform(invalid, bodyMetadata);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(BadRequestException);
      const response = (thrown as BadRequestException).getResponse() as {
        statusCode: number;
        message: unknown;
      };
      expect(response.statusCode).toBe(400);
      expect(Array.isArray(response.message)).toBe(true);
      expect((response.message as string[]).length).toBeGreaterThan(0);
    });

    it('produces the array message through the filter envelope', async () => {
      const pipe = new ZodValidationPipe();
      const invalid = { name: '', email: 'not-an-email', password: 'short' };

      let thrown: unknown;
      try {
        await pipe.transform(invalid, bodyMetadata);
      } catch (error) {
        thrown = error;
      }

      const { send, host } = mockHost();
      filter.catch(
        thrown as BadRequestException,
        host as Parameters<GlobalExceptionFilter['catch']>[1],
      );

      const sent = send.mock.calls[0][0] as {
        statusCode: number;
        message: unknown;
        error: string;
      };
      expect(sent.statusCode).toBe(400);
      expect(Array.isArray(sent.message)).toBe(true);
      expect(sent.error).toBe('Bad Request');
    });
  });
});
