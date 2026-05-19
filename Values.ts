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

  commit(): boolean {
    return false;
  }
}

export class ProjectedValue<T = any> {
  public current: BaseValue<T>;
  public projected: BaseValue<T> | null = null;

  constructor(value: BaseValue<T>) {
    this.current = value;
  }

  setProjected(projected: BaseValue<T>) {
    if (this.projected !== null) {
      this.projected = UnknownValue;
    } else {
      this.projected = projected;
    }
  }

  commit(): boolean {
    if (this.projected !== null) {
      if (this.current.equals(this.projected)) {
        this.projected = null;
        return false;
      }
      this.current = this.projected;
      this.projected = null;
      return true;
    }
    return this.current.commit();
  }
}

export const UnknownValue = new class extends BaseValue<any> {
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

export class ArrayValue<T extends BaseValue<any>> extends BaseValue<ProjectedValue<T>[]> {
  constructor(
    values: T[],
  ) {
    super(values.map((v) => new ProjectedValue(v)));
    const type = values[0]?.getType() || UnknownType;
    for (const value of values) {
      if (!type.isType(value)) {
        throw new Error(
          `Array element type mismatch: expected ${type.toString()}, got ${value.getType().toString()}`,
        );
      }
    }
  }

  getType(): BaseType {
    if (this.value.length === 0) {
      return new ArrayType(UnknownType, 0, -1);
    }
    const elementType = this.value[0]!.current.getType();
    return new ArrayType(elementType, 0, this.value.length - 1);
  }

  toString(): string {
    const elements = this.value.map((v) => v.current.toString()).join(", ");
    return `[${elements}]`;
  }

  override equals(other: BaseValue<any>): boolean {
    if (other instanceof ArrayValue) {
      if (this.value.length !== other.value.length) {
        return false;
      }
      for (let i = 0; i < this.value.length; i++) {
        if (!this.value[i]!.current.equals(other.value[i]!.current)) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  override commit(): boolean {
    let changed = false;
    for (const element of this.value) {
      if (element.commit()) {
        changed = true;
      }
    }
    return changed;
  }
}
