import type { Cloneable } from "./Cloneable";
import type { Expression } from "./Expression";
import { getIndent, indentCtx, type FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import type { Scope } from "./Scope";
import type { Target } from "./Target";
import { IntType } from "./Types";

export type ExecutionResult = "continue" | "cycle-block" | "step-block" | "break";

export abstract class SequentialStatement implements Formattable, Cloneable {
  abstract execute(scope: Scope): ExecutionResult;
  abstract toString(fmt?: FmtContext): string;
  abstract clone(): this;
}

export class SignalAssignment extends SequentialStatement {
  constructor(
    public target: Target,
    public expression: Expression,
  ) {
    super();
  }

  execute(scope: Scope): ExecutionResult {
    const value = this.expression.evaluate(scope);
    scope.setProjectedValue(this.target, value);
    return "continue";
  }

  toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    return `${indent}${this.target} <= ${this.expression.toString()};`;
  }

  clone(): this {
    return new SignalAssignment(this.target, this.expression) as this;
  }
}

export class WaitForStatement extends SequentialStatement {
  public waitUntil: number | null = null;

  constructor(public expression: Expression) {
    super();
  }

  execute(scope: Scope): ExecutionResult {
    if (this.waitUntil !== null) {
      const currentStep = scope.getStepCount();
      if (currentStep >= this.waitUntil) {
        this.waitUntil = null;
        return "continue";
      }
      return "step-block";
    } else {
      const value = this.expression.evaluate(scope);
      if (IntType.isType(value)) {
        this.waitUntil = scope.getStepCount() + value.value;
        return "step-block";
      }
      throw new Error(`WaitFor expression must evaluate to an integer, got ${value}`);
    }
  }

  toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    return `${indent}wait for ${this.expression.toString()};`;
  }

  clone(): this {
    return new WaitForStatement(this.expression) as this;
  }
}

export class PrintStatement extends SequentialStatement {
  constructor(public message: Expression) {
    super();
  }

  execute(scope: Scope): ExecutionResult {
    const value = this.message.evaluate(scope);
    console.log(value.toString({ print: true }));
    return "continue";
  }

  toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    return `${indent}print ${this.message.toString()};`;
  }

  clone(): this {
    return new PrintStatement(this.message) as this;
  }
}

export class IfStatement extends SequentialStatement {
  constructor(
    public branches: { condition: Expression; statements: SequentialStatement[] }[],
    public elseBranch: SequentialStatement[] = [],
  ) {
    super();
  }

  execute(scope: Scope): ExecutionResult {
    for (const branch of this.branches) {
      const conditionValue = branch.condition.evaluate(scope);
      if (conditionValue.value) {
        for (const stmt of branch.statements) {
          const result = stmt.execute(scope);
          if (result !== "continue") {
            return result;
          }
        }
        return "continue";
      }
    }
    for (const stmt of this.elseBranch) {
      const result = stmt.execute(scope);
      if (result !== "continue") {
        return result;
      }
    }
    return "continue";
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
    return `${indent}${branchesStr}${elseStr}`;
  }

  clone(): this {
    const clonedBranches = this.branches.map(({ condition, statements }) => ({
      condition,
      statements: statements.map((stmt) => stmt.clone()),
    }));
    const clonedElseBranch = this.elseBranch.map((stmt) => stmt.clone());
    return new IfStatement(clonedBranches, clonedElseBranch) as this;
  }
}
