import { Cache } from '@nestjs/cache-manager';
import { createHash } from 'crypto';
import { Mutex } from 'async-mutex';

const functionCallMutexes = new Map();

// wraps the manual usage of cache-manager
// generates globally unique cache key based on class name, method name and arguments
export function Cacheable(options?: { key?: string; ttl?: number }) {
  const log = false;

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
        options?.key ||
        hash({
          class: target.constructor.name,
          func: propertyName,
          args: args,
        });

      // lock concurrent @Cacheable() calls
      const mutex = getFunctionCallMutex(cacheKey);
      const mutexRelease = await mutex.acquire();

      try {
        const cachedResult = await cacheManager.get(cacheKey);

        if (cachedResult !== undefined && cachedResult !== null) {
          if (log) logger.debug(`Cache hit: ${cacheKey}`);
          return cachedResult;
        } else {
          if (log) logger.debug(`Cache miss: ${cacheKey}`);
        }

        const result = originalMethod.apply(this, args);

        // because nest js cache managed is async
        if (!(result instanceof Promise))
          throw new Error('@Cacheable() method must return a Promise');

        await cacheManager.set(
          cacheKey,
          await result,
          options?.ttl ?? undefined,
        );

        if (log) logger.debug(`Cache set: ${cacheKey}`);
        return await result;
      } finally {
        mutexRelease();
        functionCallMutexes.delete(cacheKey);
      }
    };

    return descriptor;
  };
}
