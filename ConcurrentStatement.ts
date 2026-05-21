import type { Cloneable } from "./Cloneable";
import type { Expression } from "./Expression";
import { getIndent, indentCtx, type FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import type { PortMap } from "./PortMap";
import type { Scope } from "./Scope";
import type { SequentialStatement } from "./SequentialStatement";
import type { Target } from "./Target";

export abstract class ConcurrentStatement implements Formattable, Cloneable {
  abstract execute(scope: Scope): void;
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

  execute(scope: Scope): void {
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

  execute(scope: Scope): void {
    this.portMap.scope = scope;
    this.portMap.execute();
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

  execute(scope: Scope): void {}

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

export class ProcessStatement extends ConcurrentStatement {
  public stoppedAt = 0;
  public stopped = false;
  public deltaCycleContinue = false;

  constructor(public statements: SequentialStatement[]) {
    super();
  }

  execute(scope: Scope): void {
    if (this.stopped) return;
    for (let i = this.stoppedAt; i < this.statements.length; i++) {
      const result = this.statements[i]!.execute(scope);
      if (result === "cycle-block") {
        this.stoppedAt = i + 1;
        this.deltaCycleContinue = true;
        return;
      } else if (result === "step-block") {
        this.stoppedAt = i;
        this.stopped = true;
        return;
      }
    }

    this.stoppedAt = 0;
  }

  override commit(scope: Scope): boolean {
    if (this.deltaCycleContinue) {
      this.deltaCycleContinue = false;
      return true;
    }
    return false;
  }

  override postStep(scope: Scope): void {
    if (this.stopped) {
      this.stopped = false;
    }
  }

  toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    const innerFmt = indentCtx(fmt);
    const statementsStr = this.statements
      .map((stmt) => stmt.toString(innerFmt))
      .join("\n");
    return `${indent}process begin\n${statementsStr}\n${indent}end`;
  }

  clone(): this {
    const clonedStatements = this.statements.map((stmt) => stmt.clone());
    return new ProcessStatement(clonedStatements) as this;
  }
}
