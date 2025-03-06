export function Retryable(options?: { retries?: number; delay?: number }) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      let retries = options?.retries ?? 3;

      do {
        try {
          return await originalMethod.apply(this, args);
        } catch (err) {
          if (retries > 0) {
            if (options?.delay)
              await new Promise((resolve) =>
                setTimeout(resolve, options?.delay),
              );
          } else {
            throw err;
          }
        }
      } while (retries-- > 0);
    };

    return descriptor;
  };
}
