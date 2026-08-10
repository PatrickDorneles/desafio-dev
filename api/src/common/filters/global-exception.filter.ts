import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { buildErrorEnvelope } from '../utils/envelope.util';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter<unknown> {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const responseBody = exception.getResponse();
      const error =
        typeof responseBody === 'object' &&
        responseBody !== null &&
        'error' in responseBody
          ? String((responseBody as { error: unknown }).error)
          : exception.name;

      response
        .status(statusCode)
        .send(buildErrorEnvelope(statusCode, exception.message, error));
      return;
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send(
        buildErrorEnvelope(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Internal server error',
          'Internal Server Error',
        ),
      );
  }
}
