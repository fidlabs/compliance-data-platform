import { Cache } from 'cache-manager';
import { createHash } from 'crypto';

// wraps the manual usage of cache-manager
// generates globally unique cache key based on class name, method name and arguments
export function Cacheable(options: { key?: string; ttl?: number }) {
  function hash(data: any): string {
    return createHash('md5').update(JSON.stringify(data)).digest('hex');
  }

  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheManager: Cache = this.cacheManager;

      if (!cacheManager)
        throw new Error(
          'Cannot use Cacheable() decorator without injecting the cache manager',
        );

      const cacheKey =
        options.key ||
        hash({
          class: target.constructor.name,
          func: propertyName,
          args: args,
        });

      const cachedResult = await cacheManager.get(cacheKey);

      if (cachedResult !== undefined && cachedResult !== null)
        return cachedResult;

      const result = await originalMethod.apply(this, args);
      await cacheManager.set(cacheKey, result, options.ttl);

      return result;
    };

    return descriptor;
  };
}
