import type { Cloneable } from "./Cloneable";
import type { Expression } from "./Expression";
import { getIndent, type FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import type { PortMap } from "./PortMap";
import type { Scope } from "./Scope";
import type { Target } from "./Target";

export abstract class ConcurrentStatement implements Formattable, Cloneable {
  abstract run(scope: Scope): void;
  commit(scope: Scope): boolean {
    return false;
  }
  postCycle(scope: Scope): void {}
  postStep(scope: Scope): void {}
  abstract toString(fmt?: FmtContext): string;
  abstract clone(): this;
}

export class ConcurrentSignalAssignment extends ConcurrentStatement {
  constructor(
    public target: Target,
    public expression: Expression,
  ) {
    super();
  }

  run(scope: Scope): void {
    const value = this.expression.evaluate(scope);
    scope.setProjectedValue(this.target, value);
  }

  toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    return `${indent}${this.target} <= ${this.expression.toString()};`;
  }

  clone(): this {
    return new ConcurrentSignalAssignment(this.target, this.expression) as this;
  }
}

export class PortMapStatement extends ConcurrentStatement {
  constructor(public portMap: PortMap) {
    super();
  }

  run(scope: Scope): void {
    this.portMap.scope = scope;
    this.portMap.run();
  }

  override commit(): boolean {
    return this.portMap.commit();
  }

  override postCycle(): void {
    this.portMap.postCycle();
  }

  toString(fmt?: FmtContext): string {
    return this.portMap.toString(fmt);
  }

  clone(): this {
    return new PortMapStatement(this.portMap.clone()) as this;
  }
}

// TODO: this shouldn't be here
export class PrintStatement extends ConcurrentStatement {
  constructor(public message: Expression) {
    super();
  }

  run(scope: Scope): void {}

  override postStep(scope: Scope): boolean {
    console.log(this.message.evaluate(scope).value.toString());
    return false;
  }

  override toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    return `${indent}print ${this.message.toString(fmt)};`;
  }

  clone(): this {
    return new PrintStatement(this.message) as this;
  }
}
