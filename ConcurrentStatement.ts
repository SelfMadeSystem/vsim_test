import type { Cloneable } from "./Cloneable";
import type { Expression } from "./Expression";
import { getIndent, indentCtx, type FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import type { PortMap } from "./PortMap";
import { Scope } from "./Scope";
import type { SequentialStatement } from "./SequentialStatement";
import type { Target } from "./Target";
import type { BaseType } from "./Types";
import { TrackedValue, TRUE, type BaseValue, type Triggerable } from "./Values";

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
export class ConcurrentPrintStatement extends ConcurrentStatement {
  constructor(public message: Expression) {
    super();
  }

  execute(scope: Scope): void {}

  override postStep(scope: Scope): void {
    console.log(this.message.evaluate(scope).toString({ print: true }));
  }

  override toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    return `${indent}print ${this.message.toString(fmt)};`;
  }

  clone(): this {
    return new ConcurrentPrintStatement(this.message) as this;
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
    public sensitivityList: Target[],
    public statements: SequentialStatement[],
  ) {
    super();
  }

  override setup(scope: Scope): void {
    this.triggered = true; // trigger at time 0
    for (const dep of this.sensitivityList) {
      const trackedValue = dep.getValue(scope);
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

    let triggered = this.triggered || this.paused || this.deltaCycleContinue;

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

export class BlockStatement extends ConcurrentStatement {
  public scope: Scope | null = null;
  // store values before scope gets created so that we can add them when creating the scope
  private valuesToSet: [string, BaseValue<any>][] = [];

  constructor(public statements: ConcurrentStatement[]) {
    super();
  }

  addSignal(name: string, type: BaseType) {
    if (this.scope) {
      this.scope.addTrackedValue(
        name,
        new TrackedValue(type, type.getDefaultValue()),
      );
    } else {
      this.valuesToSet.push([name, type.getDefaultValue()]);
    }
  }

  addSignalDef(name: string, type: BaseType, initialValue: BaseValue<any>) {
    if (!type.isType(initialValue)) {
      throw new Error(
        `Type mismatch for signal ${name}: expected ${type.toString()}, got ${initialValue.getType().toString()}`,
      );
    }
    if (this.scope) {
      this.scope.addTrackedValue(name, new TrackedValue(type, initialValue));
    } else {
      this.valuesToSet.push([name, initialValue]);
    }
  }

  addConcurrentStatement(statement: ConcurrentStatement) {
    this.statements.push(statement);
  }

  override setup(scope: Scope): void {
    this.scope = new Scope("block", scope.globalScope).withArchitecture(
      scope.getArchitecture(),
    );
    this.scope.parent = scope;
    for (const [name, value] of this.valuesToSet) {
      this.scope.addTrackedValue(
        name,
        new TrackedValue(value.getType(), value),
      );
    }
    for (const statement of this.statements) {
      statement.setup(this.scope);
    }
  }

  execute(scope: Scope): void {
    if (!this.scope) {
      throw new Error("Block scope not initialized");
    }
    for (const statement of this.statements) {
      statement.execute(this.scope);
    }
  }

  override commit(scope: Scope): boolean {
    if (!this.scope) {
      throw new Error("Block scope not initialized");
    }
    let changed = false;
    for (const statement of this.statements) {
      if (statement.commit(this.scope)) changed = true;
    }
    if (this.scope.commit()) changed = true;
    return changed;
  }

  override postCycle(scope: Scope): void {
    if (!this.scope) {
      throw new Error("Block scope not initialized");
    }
    for (const statement of this.statements) {
      statement.postCycle(this.scope);
    }
  }

  override preStep(scope: Scope): void {
    if (!this.scope) {
      throw new Error("Block scope not initialized");
    }
    for (const statement of this.statements) {
      statement.preStep(this.scope);
    }
  }

  override postStep(scope: Scope): void {
    if (!this.scope) {
      throw new Error("Block scope not initialized");
    }
    for (const statement of this.statements) {
      statement.postStep(this.scope);
    }
  }

  toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    const innerFmt = indentCtx(fmt);
    const signalsStr = this.scope ? this.scope.signalsToString(innerFmt) : "";
    const statementsStr = this.statements
      .map((stmt) => stmt.toString(innerFmt))
      .join("\n");
    const blockHeader = signalsStr
      ? `block is\n${signalsStr}\n${indent}begin`
      : `block begin`;
    return `\
${indent}${blockHeader}
${statementsStr}
${indent}end block;`;
  }

  clone(): this {
    const clonedStatements = this.statements.map((stmt) => stmt.clone());
    const clone = new BlockStatement(clonedStatements) as this;
    clone.scope = this.scope?.clone() ?? null;
    clone.valuesToSet.push(...this.valuesToSet);
    return clone;
  }
}

export class ConcurrentIfStatement extends ConcurrentStatement {
  public executedBranchIndex: number = -1; // -1 means else branch, otherwise index of branches array
  constructor(
    public branches: {
      condition: Expression;
      statements: ConcurrentStatement[];
    }[],
    public elseBranch: ConcurrentStatement[] = [],
  ) {
    super();
  }

  *allStatements(): Iterable<ConcurrentStatement> {
    for (const { statements } of this.branches) {
      yield* statements;
    }
    yield* this.elseBranch;
  }

  *executedStatements(): Iterable<ConcurrentStatement> {
    if (this.executedBranchIndex === -1) {
      yield* this.elseBranch;
    } else {
      yield* this.branches[this.executedBranchIndex]!.statements;
    }
  }

  override setup(scope: Scope): void {
    for (const statement of this.allStatements()) {
      statement.setup(scope);
    }
  }

  execute(scope: Scope): void {
    this.executedBranchIndex = -1;
    for (let i = 0; i < this.branches.length; i++) {
      const { condition } = this.branches[i]!;
      const conditionValue = condition.evaluate(scope);
      if (conditionValue.equals(TRUE)) {
        this.executedBranchIndex = i;
        break;
      }
    }
    for (const statement of this.executedStatements()) {
      statement.execute(scope);
    }
  }

  override commit(scope: Scope): boolean {
    let changed = false;
    for (const statement of this.executedStatements()) {
      if (statement.commit(scope)) changed = true;
    }
    return changed;
  }

  override postCycle(scope: Scope): void {
    for (const statement of this.executedStatements()) {
      statement.postCycle(scope);
    }
  }

  override preStep(scope: Scope): void {
    for (const statement of this.allStatements()) {
      statement.preStep(scope);
    }
  }

  override postStep(scope: Scope): void {
    for (const statement of this.executedStatements()) {
      statement.postStep(scope);
    }
  }

  toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    const innerFmt = indentCtx(fmt);
    const branchesStr = this.branches
      .map(
        ({ condition, statements }) =>
          `if ${condition.toString(innerFmt)} then\n${statements
            .map((stmt) => stmt.toString(indentCtx(innerFmt)))
            .join("\n")}`,
      )
      .join(`\n${indent}els`);
    const elseStr = this.elseBranch.length
      ? `\n${indent}else\n${this.elseBranch
          .map((stmt) => stmt.toString(indentCtx(innerFmt)))
          .join("\n")}`
      : "";
    return `${indent}${branchesStr}${elseStr}\n${indent}end if;`;
  }

  clone(): this {
    const clonedBranches = this.branches.map(({ condition, statements }) => ({
      condition,
      statements: statements.map((stmt) => stmt.clone()),
    }));
    const clonedElseBranch = this.elseBranch.map((stmt) => stmt.clone());
    return new ConcurrentIfStatement(clonedBranches, clonedElseBranch) as this;
  }
}
