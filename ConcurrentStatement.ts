import type { Architecture } from "./Architecture";
import type { Expression } from "./Expression";
import { getIndent, type FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";

export abstract class ConcurrentStatement implements Formattable {
  abstract run(architecture: Architecture): void;
  abstract toString(fmt?: FmtContext): string;
}

export class SignalAssignment extends ConcurrentStatement {
  constructor(
    public signalName: string,
    public expression: Expression,
  ) {
    super();
  }

  run(architecture: Architecture): void {
    const value = this.expression.evaluate(architecture);
    architecture.setProjectedValue(this.signalName, value);
  }

  toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    return `${indent}${this.signalName} <= ${this.expression.toString()};`;
  }
}
