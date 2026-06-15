import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { F0Id } from './utils';

// Big Int
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

// f0 ID
export type F0IdInput = `f0${number}` | `${number}` | bigint | number;

export function isF0IdInput(input: unknown): input is F0IdInput {
  if (
    typeof input !== 'string' &&
    typeof input !== 'bigint' &&
    typeof input !== 'number'
  ) {
    return false;
  }

  try {
    F0Id.from(input);
    return true;
  } catch {
    return false;
  }
}

@ValidatorConstraint()
export class IsF0IdInputConstraint implements ValidatorConstraintInterface {
  validate(value: any, _validationArguments: ValidationArguments): boolean {
    return isF0IdInput(value);
  }
}

export function IsF0IdInput(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: function (validationArguments) {
          return `${String(validationArguments.value)} is not valid "f0" ID input`;
        },
        ...validationOptions,
      },
      constraints: [],
      validator: IsF0IdInputConstraint,
    });
  };
}
