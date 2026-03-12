import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction) {
    // const userAgent = request.get('user-agent') || '';
    // this.logger.verbose(
    //   `${request.method} ${request.originalUrl} from ${userAgent}`,
    // );

    const requestStartAt = process.hrtime();
    const send = response.send;

    response.send = (data) => {
      const requestEndAt = process.hrtime(requestStartAt);
      const responseTime = requestEndAt[0] * 1e3 + requestEndAt[1] * 1e-6;
      const cacheHit = response.get('X-Cache') === 'HIT' ? '(X-Cache HIT)' : '';

      this.logger.debug(
        `${request.method} ${request.originalUrl}: ${response.statusCode} +${responseTime.toFixed(0)}ms ${cacheHit}`,
      );

      response.send = send;
      return response.send(data);
    };

    next();
  }
}
