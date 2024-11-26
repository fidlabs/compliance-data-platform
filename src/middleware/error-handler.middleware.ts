import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class ErrorHandlerMiddleware implements ExceptionFilter {
  private logger = new Logger('HTTP');

  catch(exception: Error | HttpException | any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (exception instanceof HttpException) {
      if (exception.getStatus() >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.warn(
          `${request.method} ${request.url}: ${exception.getStatus()} ${exception.message}`,
        );
      } else {
        this.logger.log(
          `${request.method} ${request.url}: ${exception.getStatus()} ${exception.message}`,
        );
      }

      response.status(exception.getStatus()).json({
        statusCode: exception.getStatus(),
        message: exception.message,
      });
    } else {
      this.logger.error(
        `${request.method} ${request.url}: ${HttpStatus.INTERNAL_SERVER_ERROR} ${exception.message || exception}`,
        exception.stack,
      );

      if (process.env.NODE_ENV === 'development') {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: exception.message || 'Internal Server Error',
          stack: exception.stack || undefined,
        });
      } else {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal Server Error',
        });
      }
    }
  }
}
