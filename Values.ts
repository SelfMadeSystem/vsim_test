import { unknownValue } from "./Consts";
import type { Formattable } from "./Formattable";
import {
  BaseType,
  BitType,
  IntType,
  StringType,
  ArrayType,
  UnknownType,
} from "./Types";

export abstract class BaseValue<T> implements Formattable {
  public value: T;

  constructor(value: T) {
    this.value = value;
  }

  abstract getType(): BaseType;
  abstract toString(): string;

  equals(other: BaseValue<any>): boolean {
    if (this.getType().equals(other.getType())) {
      return this.value === other.value;
    }
    return false;
  }
}

export class ProjectedValue<T> {
  public current: BaseValue<T>;
  public projected: BaseValue<T> | null = null;

  constructor(value: BaseValue<T>) {
    this.current = value;
  }

  setProjected(projected: BaseValue<T>) {
    if (this.projected !== null) {
      this.projected = new UnknownValue();
    } else {
      this.projected = projected;
    }
  }

  commit() {
    if (this.projected !== null) {
      this.current = this.projected;
      this.projected = null;
    }
  }
}

export class UnknownValue extends BaseValue<any> {
  constructor() {
    super(unknownValue);
  }

  getType(): BaseType {
    return UnknownType;
  }

  toString(): string {
    return "x";
  }
}

export class BitValue extends BaseValue<boolean> {
  constructor(value: boolean | 0 | 1) {
    super(Boolean(value));
  }

  getType(): BaseType {
    return BitType;
  }

  toString(): string {
    return this.value ? "1" : "0";
  }
}

export class IntValue extends BaseValue<number> {
  constructor(value: number) {
    super(value);
  }

  getType(): BaseType {
    return IntType;
  }

  toString(): string {
    return this.value.toString();
  }
}

export class StringValue extends BaseValue<string> {
  constructor(value: string) {
    super(value);
  }

  getType(): BaseType {
    return StringType;
  }

  toString(): string {
    return `"${this.value.replace(/"/g, '\\"')}"`;
  }
}

export class ArrayValue<T extends BaseValue<any>> extends BaseValue<T[]> {
  constructor(
    public type: ArrayType,
    values: T[],
  ) {
    super(values);
    if (values.length !== type.length) {
      throw new Error(
        `Array length mismatch: expected ${type.length}, got ${values.length}`,
      );
    }
    for (const value of values) {
      if (!value.getType().equals(type.elementType)) {
        throw new Error(
          `Array element type mismatch: expected ${type.elementType.toString()}, got ${value.getType().toString()}`,
        );
      }
    }
  }

  getType(): BaseType {
    return this.type;
  }

  toString(): string {
    const elements = this.value.map((v) => v.toString()).join(", ");
    return `[${elements}]`;
  }
}
