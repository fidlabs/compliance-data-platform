import { sleep } from './utils';

// requires function to return a Promise
export function Retryable(options?: {
  retries?: number;
  delay?: number;
  delayMin?: number;
  delayMax?: number;
}) {
  const log = false;

  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      const logger = this.logger ?? console;
      let retries = options?.retries ?? 3;

      const delay =
        options?.delayMin && options?.delayMax
          ? Math.floor(
              Math.random() * (options.delayMax - options.delayMin) +
                options.delayMin,
            )
          : options?.delay;

      do {
        try {
          return await originalMethod.apply(this, args);
        } catch (err) {
          if (retries > 0) {
            if (log)
              logger.debug(
                `${target.constructor.name}.${propertyName}(${args}) failed: ${err.message}. Retrying after ${delay ?? 0}ms...`,
              );

            if (delay) await sleep(delay);
          } else {
            throw err;
          }
        }
      } while (retries-- > 0);
    };

    return descriptor;
  };
}
