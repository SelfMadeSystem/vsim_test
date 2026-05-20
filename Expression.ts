import type { Architecture } from "./Architecture";
import type { FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import type { Scope } from "./Scope";
import type { Target } from "./Target";
import { BitType, IntType } from "./Types";
import { BitValue, IntValue, StringValue, UnknownValue, type BaseValue } from "./Values";

export abstract class Expression implements Formattable {
  abstract evaluate(architecture: Scope): BaseValue<any>;
  abstract toString(fmt?: FmtContext): string;
}

export class SignalExpression extends Expression {
  constructor(public target: Target) {
    super();
  }

  evaluate(scope: Scope): BaseValue<any> {
    const value = this.target.getValue(scope);
    if (value === undefined) {
      throw new Error(`Signal ${this.target} not found in architecture`);
    }
    return value.current;
  }

  toString(fmt?: FmtContext): string {
    return this.target.toString(fmt);
  }
}

export class LiteralExpression extends Expression {
  constructor(public value: BaseValue<any>) {
    super();
  }

  evaluate(): BaseValue<any> {
    return this.value;
  }

  toString(fmt?: FmtContext): string {
    return this.value.toString();
  }
}

export abstract class BinaryOperator implements Formattable {
  abstract apply(left: BaseValue<any>, right: BaseValue<any>): BaseValue<any>;
  abstract toString(fmt?: FmtContext): string;

  static makeOperator(
    symbol: string,
    applyFunc: (left: BaseValue<any>, right: BaseValue<any>) => BaseValue<any>,
  ): BinaryOperator {
    return new (class extends BinaryOperator {
      apply(left: BaseValue<any>, right: BaseValue<any>): BaseValue<any> {
        return applyFunc(left, right);
      }

      toString(fmt?: FmtContext): string {
        return symbol;
      }
    })();
  }

  static AND = this.makeOperator("AND", (left, right) => {
    if (left === UnknownValue || right === UnknownValue) {
      console.warn(`AND operator received unknown value.`);
      return UnknownValue;
    }
    if (BitType.isType(left) && BitType.isType(right)) {
      return new BitValue((left.value as boolean) && (right.value as boolean));
    }
    if (IntType.isType(left) && IntType.isType(right)) {
      return new IntValue((left.value as number) & (right.value as number));
    }
    throw new Error(
      `AND operator requires bit or int values. Got ${left.getType().toString()} and ${right.getType().toString()}`,
    );
  });

  static OR = this.makeOperator("OR", (left, right) => {
    if (left === UnknownValue || right === UnknownValue) {
      console.warn(`OR operator received unknown value.`);
      return UnknownValue;
    }
    if (BitType.isType(left) && BitType.isType(right)) {
      return new BitValue((left.value as boolean) || (right.value as boolean));
    }
    if (IntType.isType(left) && IntType.isType(right)) {
      return new IntValue((left.value as number) | (right.value as number));
    }
    throw new Error(
      `OR operator requires bit or int values. Got ${left.getType().toString()} and ${right.getType().toString()}`,
    );
  });

  static XOR = this.makeOperator("XOR", (left, right) => {
    if (left === UnknownValue || right === UnknownValue) {
      console.warn(`XOR operator received unknown value.`);
      return UnknownValue;
    }
    if (BitType.isType(left) && BitType.isType(right)) {
      return new BitValue(
        (left.value as boolean) !== (right.value as boolean),
      );
    }
    if (IntType.isType(left) && IntType.isType(right)) {
      return new IntValue((left.value as number) ^ (right.value as number));
    }
    throw new Error(
      `XOR operator requires bit or int values. Got ${left.getType().toString()} and ${right.getType().toString()}`,
    );
  });

  static NAND = this.makeOperator("NAND", (left, right) => {
    if (left === UnknownValue || right === UnknownValue) {
      console.warn(`NAND operator received unknown value.`);
      return UnknownValue;
    }
    if (BitType.isType(left) && BitType.isType(right)) {
      return new BitValue(
        !((left.value as boolean) && (right.value as boolean)),
      );
    }
    if (IntType.isType(left) && IntType.isType(right)) {
      return new IntValue(~((left.value as number) & (right.value as number)));
    }
    throw new Error(
      `NAND operator requires bit or int values. Got ${left.getType().toString()} and ${right.getType().toString()}`,
    );
  });

  static AMPERSAND = this.makeOperator("&", (left, right) => {
    // For simplicity sake, let's convert both to strings and concatenate
    const leftVal = left === UnknownValue ? "unknown" : left.toString();
    const rightVal = right === UnknownValue ? "unknown" : right.toString();
    return new StringValue(leftVal + rightVal);
  });
}

export class BinaryExpression extends Expression {
  constructor(
    public left: Expression,
    public operator: BinaryOperator,
    public right: Expression,
  ) {
    super();
  }

  evaluate(scope: Scope): BaseValue<any> {
    const leftValue = this.left.evaluate(scope);
    const rightValue = this.right.evaluate(scope);
    return this.operator.apply(leftValue, rightValue);
  }

  toString(fmt?: FmtContext): string {
    return `(${this.left.toString(fmt)} ${this.operator.toString(fmt)} ${this.right.toString(fmt)})`;
  }
}

export abstract class UnaryOperator implements Formattable {
  abstract apply(operand: BaseValue<any>): BaseValue<any>;
  abstract toString(fmt?: FmtContext): string;

  static NOT: UnaryOperator = new (class extends UnaryOperator {
    apply(operand: BaseValue<any>): BaseValue<any> {
      if (!BitType.isType(operand)) {
        throw new Error(
          `NOT operator requires bit value. Got ${operand.getType().toString()}`,
        );
      }
      return new BitValue(!(operand.value as boolean));
    }

    toString(fmt?: FmtContext): string {
      return "NOT";
    }
  })();
}

export class UnaryExpression extends Expression {
  constructor(
    public operator: UnaryOperator,
    public operand: Expression,
  ) {
    super();
  }

  evaluate(scope: Scope): BaseValue<any> {
    const operandValue = this.operand.evaluate(scope);
    return this.operator.apply(operandValue);
  }

  toString(fmt?: FmtContext): string {
    return `(${this.operator.toString(fmt)} ${this.operand.toString(fmt)})`;
  }
}

export class IndexExpression extends Expression {
  constructor(
    public array: Expression,
    public index: Expression,
  ) {
    super();
  }

  evaluate(scope: Scope): BaseValue<any> {
    const arrayValue = this.array.evaluate(scope);
    const indexValue = this.index.evaluate(scope);
    if (!Array.isArray(arrayValue.value)) {
      throw new Error(`Index operator requires array value`);
    }
    if (typeof indexValue.value !== "number") {
      throw new Error(`Index operator requires numeric index`);
    }
    const element = arrayValue.value[indexValue.value];
    if (element === undefined) {
      throw new Error(`Index out of bounds`);
    }
    return element;
  }

  toString(fmt?: FmtContext): string {
    return `${this.array.toString(fmt)}[${this.index.toString(fmt)}]`;
  }
}
