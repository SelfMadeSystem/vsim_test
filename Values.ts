import type { Cloneable } from "./Cloneable";
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

export abstract class BaseValue<T> implements Formattable, Cloneable {
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

  abstract clone(): this;
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

export class OutProjectedValue<T = any> extends ProjectedValue<T> {
  constructor(value: BaseValue<T>, public outCb: (value: BaseValue<T>) => void) {
    super(value);
  }

  override commit(): boolean {
    const changed = super.commit();
    if (changed) {
      this.outCb(this.current);
    }
    return changed;
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

  clone(): this {
    return this;
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

  clone(): this {
    return new BitValue(this.value) as this;
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

  clone(): this {
    return new IntValue(this.value) as this;
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

  clone(): this {
    return new StringValue(this.value) as this;
  }
}

export class ArrayValue<T> extends BaseValue<ProjectedValue<T>[]> {
  constructor(
    values: BaseValue<T>[],
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

  clone(): this {
    const clonedElements = this.value.map((v) => new ProjectedValue(v.current.clone()));
    return new ArrayValue(clonedElements.map((v) => v.current)) as this;
  }
}
