import type { Formattable } from "./Formattable";
import { BitValue, IntValue, StringValue, type BaseValue } from "./Values";

export abstract class BaseType implements Formattable {
  abstract toString(): string;

  abstract isType(value: BaseValue<any>): boolean;

  equals(other: BaseType): boolean {
    return this.constructor === other.constructor;
  }
}

function primitiveType<T>(name: string, check: (value: BaseValue<T>) => boolean): BaseType {
  return new class extends BaseType {
    toString(): string {
      return name;
    }

    isType(value: BaseValue<any>): boolean {
      return check(value);
    }
  };
}

export const UnknownType = primitiveType<any>("unknown", () => true);
export const BitType = primitiveType<boolean>("bit", (value) => value instanceof BitValue);
export const IntType = primitiveType<number>("int", (value) => value instanceof IntValue);
export const StringType = primitiveType<string>("string", (value) => value instanceof StringValue);

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

  override isType(value: any): boolean {
    if (Array.isArray(value) && value.length === this.length) {
      return value.every((v) => this.elementType.isType(v));
    }
    return false;
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
