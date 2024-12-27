import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class MetricsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    const requiredToken = `Bearer ${process.env.PROMETHEUS_AUTH_TOKEN}`;
    return authHeader === requiredToken;
  }
}
