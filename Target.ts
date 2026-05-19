import type { Architecture } from "./Architecture";
import type { Expression } from "./Expression";
import type { FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import { ArrayValue, IntValue, type ProjectedValue } from "./Values";

export abstract class Target implements Formattable {
  abstract getValue(arch: Architecture): ProjectedValue;
  abstract toString(fmt?: FmtContext): string;
}

export class SignalTarget extends Target {
  constructor(public signalName: string) {
    super();
  }

  getValue(arch: Architecture): ProjectedValue {
    return arch.getSignal(this.signalName);
  }

  toString(): string {
    return this.signalName;
  }
}

export class IndexedTarget extends Target {
  constructor(
    public base: Target,
    public index: Expression,
  ) {
    super();
  }

  getValue(arch: Architecture): ProjectedValue {
    const baseValue = this.base.getValue(arch);
    const indexValue = this.index.evaluate(arch);
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
