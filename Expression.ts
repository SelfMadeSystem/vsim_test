import type { Architecture } from "./Architecture";
import type { FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import { BitType } from "./Types";
import { BitValue, type BaseValue } from "./Values";

export abstract class Expression implements Formattable {
  abstract evaluate(architecture: Architecture): BaseValue<any>;
  abstract toString(fmt?: FmtContext): string;
}

export class SignalExpression extends Expression {
  constructor(public signalName: string) {
    super();
  }

  evaluate(architecture: Architecture): BaseValue<any> {
    const value = architecture.signalValues.get(this.signalName);
    if (value === undefined) {
      throw new Error(`Signal ${this.signalName} not found in architecture`);
    }
    return value.current;
  }

  toString(fmt?: FmtContext): string {
    return this.signalName;
  }
}

export class LiteralExpression extends Expression {
  constructor(public value: BaseValue<any>) {
    super();
  }

  evaluate(architecture: Architecture): BaseValue<any> {
    return this.value;
  }

  toString(fmt?: FmtContext): string {
    return this.value.toString();
  }
}

export abstract class BinaryOperator implements Formattable {
  abstract apply(left: BaseValue<any>, right: BaseValue<any>): BaseValue<any>;
  abstract toString(fmt?: FmtContext): string;

  static AND: BinaryOperator = new (class extends BinaryOperator {
    apply(left: BaseValue<any>, right: BaseValue<any>): BaseValue<any> {
      if (!BitType.isType(left) || !BitType.isType(right)) {
        throw new Error(`AND operator requires bit values`);
      }
      return new BitValue((left.value as boolean) && (right.value as boolean));
    }

    toString(fmt?: FmtContext): string {
      return "AND";
    }
  })();

  static OR: BinaryOperator = new (class extends BinaryOperator {
    apply(left: BaseValue<any>, right: BaseValue<any>): BaseValue<any> {
      if (!BitType.isType(left) || !BitType.isType(right)) {
        throw new Error(`OR operator requires bit values`);
      }
      return new BitValue((left.value as boolean) || (right.value as boolean));
    }

    toString(fmt?: FmtContext): string {
      return "OR";
    }
  })();
}

export class BinaryExpression extends Expression {
  constructor(
    public left: Expression,
    public operator: BinaryOperator,
    public right: Expression,
  ) {
    super();
  }

  evaluate(architecture: Architecture): BaseValue<any> {
    const leftValue = this.left.evaluate(architecture);
    const rightValue = this.right.evaluate(architecture);
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
        throw new Error(`NOT operator requires bit value`);
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

  evaluate(architecture: Architecture): BaseValue<any> {
    const operandValue = this.operand.evaluate(architecture);
    return this.operator.apply(operandValue);
  }

  toString(fmt?: FmtContext): string {
    return `(${this.operator.toString(fmt)} ${this.operand.toString(fmt)})`;
  }
}
