import { Cache } from '@nestjs/cache-manager';
import { createHash } from 'crypto';
import { Mutex } from 'async-mutex';

const functionCallMutexes = new Map();

// Wraps the manual usage of @nestjs/cache-manager.
// Generates globally unique cache key based on class name, function name and arguments.
// Should not be used for API endpoint functions since cache there is managed by NestJS automatically,
// Requires cache manager to be injected into the class and a function to return a Promise.
export function Cacheable(options?: {
  key?: string | ((...args: any[]) => string);
  ttl?: number;
  log?: boolean;
}) {
  function hash(data: any): string {
    return createHash('md5').update(JSON.stringify(data)).digest('hex');
  }

  function getFunctionCallMutex(cacheKey: string): Mutex {
    if (!functionCallMutexes.has(cacheKey))
      functionCallMutexes.set(cacheKey, new Mutex());

    return functionCallMutexes.get(cacheKey);
  }

  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      const cacheManager: Cache = this.cacheManager;
      const logger = this.logger ?? console;

      if (!cacheManager)
        throw new Error(
          'Cannot use @Cacheable() decorator without injecting the cache manager',
        );

      const cacheKey =
        typeof options?.key === 'function'
          ? options.key(...args)
          : (options?.key ??
            (options?.log
              ? (x) =>
                  `${x.class}.${x.func}(${x.args?.map((y) => JSON.stringify(y))?.join(' ')})`
              : hash)({
              class: target.constructor.name,
              func: propertyName,
              args: args,
            }));

      // lock concurrent @Cacheable() calls
      const mutex = getFunctionCallMutex(cacheKey);
      const mutexRelease = await mutex.acquire();

      try {
        const cachedResult = await cacheManager.get(cacheKey);

        if (cachedResult !== undefined && cachedResult !== null) {
          if (options?.log) logger.debug(`Cache hit: ${cacheKey}`);
          return cachedResult;
        } else {
          if (options?.log) logger.debug(`Cache miss: ${cacheKey}`);
        }

        const result = originalMethod.apply(this, args);

        // because NestJS cache manager is async
        if (!(result instanceof Promise))
          throw new Error('@Cacheable() method must return a Promise');

        await cacheManager.set(cacheKey, await result, options?.ttl ?? 0);

        if (options?.log)
          logger.debug(
            `Cache set: ${cacheKey}: ${JSON.stringify(await result)}`,
          );

        return await result;
      } finally {
        mutexRelease();
        functionCallMutexes.delete(cacheKey);
      }
    };

    return descriptor;
  };
}
