import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Catch()
export class ErrorHandlerMiddleware implements ExceptionFilter {
  private logger = new Logger('HTTP');

  constructor(private configService: ConfigService) {}

  catch(exception: Error | HttpException | any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (exception instanceof HttpException) {
      if (exception.getStatus() >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.warn(
          `${request.method} ${request.originalUrl}: ${exception.getStatus()} ${exception.message}`,
        );
      } else {
        this.logger.log(
          `${request.method} ${request.originalUrl}: ${exception.getStatus()} ${exception.message}`,
        );
      }

      response.status(exception.getStatus()).json(exception.getResponse());
    } else {
      this.logger.error(
        `${request.method} ${request.originalUrl}: ${HttpStatus.INTERNAL_SERVER_ERROR} ${exception.message || exception}`,
        exception.stack,
      );

      if (this.configService.get('NODE_ENV') === 'development') {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: exception.message || exception || 'Internal Server Error',
          error: 'Internal Server Error',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          stack: exception.stack || undefined,
        });
      } else {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Internal Server Error',
          error: 'Internal Server Error',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }
    }
  }
}
