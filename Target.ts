import type { Expression } from "./Expression";
import type { FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import type { Scope } from "./Scope";
import { ArrayValue, IntValue, type TrackedValue } from "./Values";

export abstract class Target implements Formattable {
  abstract getValue(arch: Scope): TrackedValue;
  abstract toString(fmt?: FmtContext): string;
}

export class NamedTarget extends Target {
  constructor(public targetName: string) {
    super();
  }

  getValue(scope: Scope): TrackedValue {
    return scope.getTrackedValue(this.targetName);
  }

  toString(): string {
    return this.targetName;
  }
}

export class IndexedTarget extends Target {
  constructor(
    public base: Target,
    public index: Expression,
  ) {
    super();
  }

  getValue(scope: Scope): TrackedValue {
    const baseValue = this.base.getValue(scope);
    const indexValue = this.index.evaluate(scope);
    if (!(indexValue instanceof IntValue)) {
      throw new Error(`Index expression must evaluate to an integer`);
    }
    const index = indexValue.value;
    if (baseValue.current instanceof ArrayValue) {
      const val = baseValue.current.value[index];
      if (!val) {
        throw new Error(
          `Index ${index} out of bounds for array signal ${this.base.toString()}`,
        );
      }
      return val;
    }
    throw new Error(`Base value of indexed target is not an array`);
  }

  toString(fmt?: FmtContext): string {
    return `${this.base.toString()}(${this.index.toString(fmt)})`;
  }
}
