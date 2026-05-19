import type { ConcurrentStatement } from "./ConcurrentStatement";
import { getIndent, indentCtx, type FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import type { Target } from "./Target";
import type { BaseType } from "./Types";
import { ProjectedValue, UnknownValue, type BaseValue } from "./Values";

export class Architecture implements Formattable {
  public name: string;
  public signalTypes: Map<string, BaseType> = new Map();
  public signalValues: Map<string, ProjectedValue> = new Map();
  public concurrentStatements: ConcurrentStatement[] = [];
  public deltaChange: boolean = false;

  constructor(name: string) {
    this.name = name;
  }

  addSignal(name: string, type: BaseType) {
    if (this.signalTypes.has(name)) {
      throw new Error(`Signal ${name} already exists in architecture`);
    }
    this.signalTypes.set(name, type);
    this.signalValues.set(name, new ProjectedValue(UnknownValue));
  }

  addSignalDef(name: string, type: BaseType, initialValue: BaseValue<any>) {
    if (this.signalTypes.has(name)) {
      throw new Error(`Signal ${name} already exists in architecture`);
    }
    if (!type.isType(initialValue)) {
      throw new Error(
        `Type mismatch for signal ${name}: expected ${type.toString()}, got ${initialValue.getType().toString()}`,
      );
    }
    this.signalTypes.set(name, type);
    this.signalValues.set(name, new ProjectedValue(initialValue));
  }

  addConcurrentStatement(statement: ConcurrentStatement) {
    this.concurrentStatements.push(statement);
  }

  setProjectedValue(target: Target, value: BaseValue<any>) {
    const projectedValue = target.getValue(this);
    projectedValue.setProjected(value);
  }

  run() {
    let i = 0;
    do {
      this.deltaChange = false;
      this.execute();
      this.commit();
      i++;
      if (i > 1000) {
        throw new Error("Simulation did not converge after 1000 iterations");
      }
    } while (this.deltaChange);
  }

  private execute() {
    for (const statement of this.concurrentStatements) {
      statement.run(this);
    }
  }

  private commit() {
    for (const [, projectedValue] of this.signalValues) {
      if (projectedValue.projected === null) continue;
      if (projectedValue.commit()) this.deltaChange = true;
    }
  }

  public signalsToString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    const lines = [];
    for (const [name, type] of this.signalTypes) {
      const value = this.signalValues.get(name);
      if (value === undefined) {
        throw new Error(`Signal ${name} not found in architecture`);
      }
      const valueStr =
        value.current === UnknownValue
          ? ""
          : ` = ${value.current.toString()}`;
      lines.push(`${indent}signal ${name}: ${type.toString()}${valueStr};`);
    }
    return lines.join("\n");
  }

  public getSignal(name: string): ProjectedValue {
    const value = this.signalValues.get(name);
    if (!value) {
      throw new Error(`Signal ${name} not found in architecture`);
    }
    return value;
  }

  public toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    const lines = [];
    if (this.signalTypes.size > 0) {
      lines.push(`${indent}architecture ${this.name} is`);
      lines.push(this.signalsToString(indentCtx(fmt)));
      lines.push(`${indent}begin`);
    } else {
      lines.push(`${indent}architecture ${this.name} begin`);
    }
    for (const statement of this.concurrentStatements) {
      lines.push(statement.toString(indentCtx(fmt)));
    }
    lines.push(`${indent}end ${this.name};`);
    return lines.join("\n");
  }
}
