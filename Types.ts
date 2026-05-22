import type { Formattable } from "./Formattable";
import {
  ArrayValue,
  BitValue,
  IntValue,
  StringValue,
  UninitializedValue,
  UnknownValue,
  type BaseValue,
} from "./Values";

export abstract class BaseType implements Formattable {
  getDefaultValue(): BaseValue<any> {
    return UninitializedValue;
  }
  abstract toString(): string;
  abstract isType(value: BaseValue<any>): boolean;

  equals(other: BaseType): boolean {
    return this.constructor === other.constructor;
  }
}

function primitiveType<T>(
  name: string,
  check: (value: BaseValue<T>) => boolean,
): BaseType {
  return new (class extends BaseType {
    toString(): string {
      return name;
    }

    isType(value: BaseValue<any>): boolean {
      return value === UnknownValue || value === UninitializedValue || check(value);
    }
  })();
}

export const UnknownType = primitiveType<any>("unknown", () => true);
export const UninitializedType = primitiveType<any>("uninitialized", () => false);
export const BitType = primitiveType<boolean>(
  "bit",
  (value) => value instanceof BitValue,
);
export const IntType = primitiveType<number>(
  "int",
  (value) => value instanceof IntValue,
);
export const StringType = primitiveType<string>(
  "string",
  (value) => value instanceof StringValue,
);

export class ArrayType extends BaseType {
  constructor(
    public elementType: BaseType,
    public start: number,
    public end: number,
    public downto: boolean = false,
  ) {
    super();
  }

  public get length(): number {
    return Math.abs(this.end - this.start) + 1;
  }

  override getDefaultValue(): BaseValue<any> {
    const values = [];
    for (let i = 0; i < this.length; i++) {
      values.push(this.elementType.getDefaultValue());
    }
    return new ArrayValue(values, this.elementType);
  }

  override isType(value: any): boolean {
    if (!(value instanceof ArrayValue)) return false;

    const type = value.getType();
    if (!(type instanceof ArrayType)) return false;

    if (this.length !== type.length) return false;
    if (!this.elementType.equals(type.elementType)) return false;

    return true;
  }

  toString(): string {
    const direction = this.downto ? "downto" : "to";
    return `array(${this.start} ${direction} ${this.end}) of ${this.elementType.toString()}`;
  }

  override equals(other: BaseType): boolean {
    if (other instanceof ArrayType) {
      return (
        this.start === other.start &&
        this.end === other.end &&
        this.downto === other.downto &&
        this.elementType.equals(other.elementType)
      );
    }
    return false;
  }
}
