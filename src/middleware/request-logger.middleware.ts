import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, _response: Response, next: NextFunction): void {
    this.logger.log(`${request.method} ${request.originalUrl}`);

    next();
  }
}
