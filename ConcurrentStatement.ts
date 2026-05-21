import type { Cloneable } from "./Cloneable";
import type { Expression } from "./Expression";
import { getIndent, indentCtx, type FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import type { PortMap } from "./PortMap";
import type { Scope } from "./Scope";
import type { SequentialStatement } from "./SequentialStatement";
import type { Target } from "./Target";
import type { Triggerable } from "./Values";

export abstract class ConcurrentStatement implements Formattable, Cloneable {
  setup(scope: Scope): void {}
  abstract execute(scope: Scope): void;
  commit(scope: Scope): boolean {
    return false;
  }
  postCycle(scope: Scope): void {}
  preStep(scope: Scope): void {}
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

  override setup(scope: Scope): void {
    this.portMap.setup(scope);
  }

  execute(scope: Scope): void {
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

  override postStep(scope: Scope): void {
    console.log(this.message.evaluate(scope).value.toString({ print: true }));
  }

  override toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    return `${indent}print ${this.message.toString(fmt)};`;
  }

  clone(): this {
    return new PrintStatement(this.message) as this;
  }
}

export class ProcessStatement
  extends ConcurrentStatement
  implements Triggerable
{
  public stoppedAt = 0;
  public stopped = false;
  public paused = false;
  public deltaCycleContinue = false;
  public triggered = true;

  constructor(
    public sensitivityList: string[],
    public statements: SequentialStatement[],
  ) {
    super();
  }

  override setup(scope: Scope): void {
    this.triggered = true; // trigger at time 0
    for (const dep of this.sensitivityList) {
      const trackedValue = scope.getTrackedValue(dep);
      if (trackedValue) {
        trackedValue.triggers.push(this);
      } else {
        throw new Error(
          `Sensitivity list item "${dep}" not found in scope "${scope.name}"`,
        );
      }
    }
  }

  execute(scope: Scope): void {
    if (this.stopped) return;

    let triggered =
      this.triggered ||
      this.paused ||
      this.deltaCycleContinue ||
      this.sensitivityList.length === 0;

    if (!triggered) return;

    this.triggered = false;
    this.deltaCycleContinue = false;
    this.paused = false;

    for (let i = this.stoppedAt; i < this.statements.length; i++) {
      const result = this.statements[i]!.execute(scope);
      if (result === "cycle-block") {
        this.stoppedAt = i + 1;
        this.deltaCycleContinue = true;
        return;
      } else if (result === "step-block") {
        this.stoppedAt = i;
        this.stopped = true;
        this.paused = true;
        return;
      }
    }

    this.stoppedAt = 0;
  }

  override commit(scope: Scope): boolean {
    if (this.deltaCycleContinue) {
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
    const sensitivityStr = this.sensitivityList.join(", ");
    const statementsStr = this.statements
      .map((stmt) => stmt.toString(innerFmt))
      .join("\n");
    return `${indent}process (${sensitivityStr}) begin\n${statementsStr}\n${indent}end process;`;
  }

  clone(): this {
    const clonedStatements = this.statements.map((stmt) => stmt.clone());
    return new ProcessStatement(this.sensitivityList, clonedStatements) as this;
  }
}
