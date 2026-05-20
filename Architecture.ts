import type { Cloneable } from "./Cloneable";
import type { Component } from "./Component";
import type { ConcurrentStatement } from "./ConcurrentStatement";
import type { Entity } from "./Entity";
import { getIndent, indentCtx, type FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import type { Target } from "./Target";
import type { BaseType } from "./Types";
import { OutProjectedValue, ProjectedValue, UnknownValue, type BaseValue } from "./Values";

export class Architecture implements Formattable, Cloneable {
  public signalTypes: Map<string, BaseType> = new Map();
  public signalValues: Map<string, ProjectedValue> = new Map();
  public concurrentStatements: ConcurrentStatement[] = [];
  public deltaChange: boolean = false;
  public component: Component | null = null;
  private ephemeralValues: Map<string, ProjectedValue> = new Map();

  constructor(
    public name: string,
    public entity: Entity,
  ) {}

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

  step(): boolean {
    this.deltaChange = false;
    this.execute();
    this.commit();
    return this.deltaChange;
  }

  private execute() {
    for (const statement of this.concurrentStatements) {
      statement.run(this);
    }
  }

  private commit() {
    for (const [, projectedValue] of [...this.signalValues, ...this.ephemeralValues]) {
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
        value.current === UnknownValue ? "" : ` = ${value.current.toString()}`;
      lines.push(`${indent}signal ${name}: ${type.toString()}${valueStr};`);
    }
    return lines.join("\n");
  }

  public getValue(name: string): ProjectedValue {
    const value = this.signalValues.get(name);
    if (value) {
      return value;
    }
    if (this.component) {
      const input = this.component.getInput(name);
      if (input) {
        return input;
      }
      const outCb = this.component.outCbs.get(name);
      if (outCb) {
        const ephemeral = this.ephemeralValues.get(name);
        if (ephemeral) {
          return ephemeral;
        }
        const newEphemeral = new OutProjectedValue(UnknownValue, outCb);
        this.ephemeralValues.set(name, newEphemeral);
        return newEphemeral;
      }
    }
    if (this.entity.outPorts.has(name)) {
      const ephemeral = this.ephemeralValues.get(name);
      if (ephemeral) {
        return ephemeral;
      }
      const newEphemeral = new ProjectedValue(UnknownValue);
      this.ephemeralValues.set(name, newEphemeral);
      console.warn(
        `Warning: Output port ${name} has no driver in architecture ${this.name}`,
      );
      return newEphemeral;
    }
    if (this.entity.inPorts.has(name)) {
      throw new Error(
        `Input port ${name} cannot be read directly from architecture ${this.name}`,
      );
    }
    throw new Error(`Signal ${name} not found in architecture`);
  }

  public withComponent(component: Component): Architecture {
    const clone = this.clone();
    clone.component = component;
    return clone;
  }

  public toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    const lines = [];
    const archStart = `${indent}architecture ${this.name} of ${this.entity.name}`;
    if (this.signalTypes.size > 0) {
      lines.push(`${archStart} is`);
      lines.push(this.signalsToString(indentCtx(fmt)));
      lines.push(`${indent}begin`);
    } else {
      lines.push(`${archStart} begin`);
    }
    for (const statement of this.concurrentStatements) {
      lines.push(statement.toString(indentCtx(fmt)));
    }
    lines.push(`${indent}end ${this.name};`);
    return lines.join("\n");
  }

  clone(): this {
    const clone = new Architecture(this.name, this.entity) as this;
    for (const [name, type] of this.signalTypes) {
      clone.signalTypes.set(name, type);
    }
    for (const [name, value] of this.signalValues) {
      clone.signalValues.set(name, new ProjectedValue(value.current));
    }
    for (const statement of this.concurrentStatements) {
      clone.concurrentStatements.push(statement);
    }
    return clone;
  }
}
