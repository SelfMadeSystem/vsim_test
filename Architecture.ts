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
  VirtualObservableTrackedValue,
  VirtualTrackedValue,
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
    cloned = false,
  ) {
    this.scope = new Scope(
      `${name}_scope`,
      this.entity.globalScope,
    ).withArchitecture(this);
    if (!cloned) {
      this.entity.addArchitecture(this);
    }
  }

  addSignal(name: string, type: BaseType) {
    this.scope.addTrackedValue(
      name,
      new TrackedValue(type, type.getDefaultValue()),
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

  setup() {
    this.scope.setup();
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

  postCycle() {
    this.scope.postCycle();
  }

  preStep() {
    this.scope.preStep();
  }

  postStep() {
    this.scope.postStep();
  }

  public signalsToString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    const lines = [];
    for (const [name, { current, type }] of this.scope.trackedValues) {
      const valueStr =
        current === UninitializedValue ? "" : ` = ${current.toString()}`;
      lines.push(`${indent}signal ${name}: ${type.toString()}${valueStr};`);
    }
    return lines.join("\n");
  }

  public getPortTrackedValue(name: string): TrackedValue {
    const ephemeral = this.ephemeralValues.get(name);
    if (ephemeral) {
      return ephemeral;
    }
    const inPort = this.entity.inPorts.get(name);
    const outPort = this.entity.outPorts.get(name);
    const inCb = this.component?.inCbs.get(name);
    const outCb = this.component?.outCbs.get(name);
    if (inCb && outCb) {
      if (!inPort || !outPort) {
        throw new Error(
          `Port ${name} has both input and output callbacks but is not an inout port`,
        );
      }
      const type = inPort.type;
      if (type.toString() !== outPort.type.toString()) {
        throw new Error(
          `Port ${name} has mismatched input and output types: ${inPort.type.toString()} vs ${outPort.type.toString()}`,
        );
      }
      const virtualValue = new VirtualObservableTrackedValue(type, inCb, outCb);
      this.ephemeralValues.set(name, virtualValue);
      return virtualValue;
    }
    if (inCb) {
      if (!inPort) {
        throw new Error(
          `Port ${name} has input callback but is not an input port`,
        );
      }
      const virtualValue = new VirtualTrackedValue(inPort.type, inCb);
      this.ephemeralValues.set(name, virtualValue);
      return virtualValue;
    }
    if (outCb) {
      if (!outPort) {
        throw new Error(
          `Port ${name} has output callback but is not an output port`,
        );
      }
      const observableValue = new ObservableTrackedValue(
        outPort.type,
        UnknownValue,
        outCb,
      );
      this.ephemeralValues.set(name, observableValue);
      return observableValue;
    }
    if (inPort || outPort) {
      console.warn(
        `Port ${name} has no callbacks but exists on entity ${this.entity.name}; treating as uninitialized signal`,
      );
      console.trace();
      const port = inPort ?? outPort!;
      const value = new TrackedValue(port.type, UninitializedValue);
      this.ephemeralValues.set(name, value);
      return value;
    }
    throw new Error(`Signal ${name} not found in architecture ${this.name}`);
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
    const clone = new Architecture(this.name, this.entity, true) as this;
    clone.scope = this.scope.clone().withArchitecture(clone);
    clone.component = this.component?.clone() ?? null;
    return clone;
  }
}
