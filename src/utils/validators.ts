import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint()
export class IsBigIntLikeConstraint implements ValidatorConstraintInterface {
  validate(value: any, _validationArguments: ValidationArguments): boolean {
    if (typeof value === 'bigint') {
      return true;
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      return false;
    }

    try {
      BigInt(value);
      return true;
    } catch {
      return false;
    }
  }
}

export function IsBigIntLike(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: function (validationArguments) {
          return `${String(validationArguments.value)} is not a valid BigInt constructor value`;
        },
        ...validationOptions,
      },
      constraints: [],
      validator: IsBigIntLikeConstraint,
    });
  };
}
