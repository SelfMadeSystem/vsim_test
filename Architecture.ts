import type { Cloneable } from "./Cloneable";
import type { Component } from "./Component";
import type { ConcurrentStatement } from "./ConcurrentStatement";
import type { Entity } from "./Entity";
import { getIndent, indentCtx, type FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import { Scope } from "./Scope";
import type { BaseType } from "./Types";
import {
  ObservableTrackedValue,
  TrackedValue,
  UninitializedValue,
  UnknownValue,
  type BaseValue,
} from "./Values";

export class Architecture implements Formattable, Cloneable {
  public scope: Scope;
  public deltaChange: boolean = false;
  public component: Component | null = null;
  private ephemeralValues: Map<string, TrackedValue> = new Map();

  constructor(
    public name: string,
    public entity: Entity,
  ) {
    this.scope = new Scope(`${name}_scope`).withArchitecture(this);
  }

  addSignal(name: string, type: BaseType) {
    this.scope.addTrackedValue(
      name,
      new TrackedValue(type, UninitializedValue),
    );
  }

  addSignalDef(name: string, type: BaseType, initialValue: BaseValue<any>) {
    if (!type.isType(initialValue)) {
      throw new Error(
        `Type mismatch for signal ${name}: expected ${type.toString()}, got ${initialValue.getType().toString()}`,
      );
    }
    this.scope.addTrackedValue(name, new TrackedValue(type, initialValue));
  }

  addConcurrentStatement(statement: ConcurrentStatement) {
    this.scope.statements.push(statement);
  }

  step(): boolean {
    this.execute();
    this.commit();
    this.postStep();
    return this.deltaChange;
  }

  execute() {
    this.scope.execute();
  }

  commit() {
    this.deltaChange = false;
    for (const [, projectedValue] of this.ephemeralValues) {
      if (projectedValue.commit()) this.deltaChange = true;
    }
    if (this.scope.commit()) this.deltaChange = true;
    return this.deltaChange;
  }

  postStep() {
    this.scope.postStep();
  }

  public signalsToString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    const lines = [];
    for (const [name, { current, type }] of this.scope.trackedValues) {
      const valueStr =
        current === UnknownValue ? "" : ` = ${current.toString()}`;
      lines.push(`${indent}signal ${name}: ${type.toString()}${valueStr};`);
    }
    return lines.join("\n");
  }

  public getPortTrackedValue(name: string): TrackedValue {
    if (this.component) {
      const input = this.component.getInput(name);
      if (input) {
        return input;
      }
    }
    const port = this.entity.outPorts.get(name);
    if (port) {
      const ephemeral = this.ephemeralValues.get(name);
      if (ephemeral) {
        return ephemeral;
      }
      if (this.component) {
        const cb = this.component.outCbs.get(name);
        if (cb) {
          const newEphemeral = new ObservableTrackedValue(
            port.type,
            UninitializedValue,
            cb,
          );
          this.ephemeralValues.set(name, newEphemeral);
          return newEphemeral;
        }
      }
      const newEphemeral = new TrackedValue(port.type, UninitializedValue);
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
    if (this.scope.trackedValues.size > 0) {
      lines.push(`${archStart} is`);
      lines.push(this.signalsToString(indentCtx(fmt)));
      lines.push(`${indent}begin`);
    } else {
      lines.push(`${archStart} begin`);
    }
    for (const statement of this.scope.statements) {
      lines.push(statement.toString(indentCtx(fmt)));
    }
    lines.push(`${indent}end ${this.name};`);
    return lines.join("\n");
  }

  clone(): this {
    const clone = new Architecture(this.name, this.entity) as this;
    clone.scope = this.scope.clone().withArchitecture(clone);
    clone.component = this.component?.clone() ?? null;
    return clone;
  }
}
