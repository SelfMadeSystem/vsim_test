import type { Architecture } from "./Architecture";
import type { Expression } from "./Expression";
import { getIndent, type FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import type { PortMap } from "./PortMap";
import type { Target } from "./Target";

export abstract class ConcurrentStatement implements Formattable {
  abstract run(architecture: Architecture): void;
  commit(architecture: Architecture): boolean {
    return false;
  }
  abstract toString(fmt?: FmtContext): string;
}

export class SignalAssignment extends ConcurrentStatement {
  constructor(
    public target: Target,
    public expression: Expression,
  ) {
    super();
  }

  run(architecture: Architecture): void {
    const value = this.expression.evaluate(architecture);
    architecture.setProjectedValue(this.target, value);
  }

  toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    return `${indent}${this.target} <= ${this.expression.toString()};`;
  }
}

export class PortMapStatement extends ConcurrentStatement {
  constructor(public portMap: PortMap) {
    super();
  }

  run(architecture: Architecture): void {
    this.portMap.parentArchitecture = architecture;
    this.portMap.run();
  }

  override commit(): boolean {
    return this.portMap.commit();
  }

  toString(fmt?: FmtContext): string {
    return this.portMap.toString(fmt);
  }
}

// TODO: this shouldn't be here
export class PrintStatement extends ConcurrentStatement {
  constructor(public message: Expression) {
    super();
  }

  run(architecture: Architecture): void {}

  override commit(architecture: Architecture): boolean {
    console.log(this.message.evaluate(architecture).value.toString());
    return false;
  }

  override toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    return `${indent}print ${this.message.toString(fmt)};`;
  }
}
