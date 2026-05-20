import type { Architecture } from "./Architecture";
import type { Cloneable } from "./Cloneable";
import type { ConcurrentStatement } from "./ConcurrentStatement";
import type { Target } from "./Target";
import { TrackedValue, type BaseValue } from "./Values";

export class Scope implements Cloneable {
  public trackedValues: Map<string, TrackedValue> = new Map();
  public parent: Scope | null = null;
  public architecture: Architecture | null = null;
  public childScopes: Set<Scope> = new Set();
  public statements: ConcurrentStatement[] = [];

  constructor(public name: string) {}

  withParent(parent: Scope): this {
    this.parent = parent;
    parent.childScopes.add(this);
    return this;
  }

  withArchitecture(architecture: Architecture): this {
    this.architecture = architecture;
    return this;
  }

  getArchitecture(): Architecture {
    if (this.architecture) return this.architecture;
    if (this.parent) return this.parent.getArchitecture();
    throw new Error(`Scope ${this.name} has no architecture`);
  }

  addTrackedValue(name: string, value: TrackedValue) {
    if (this.trackedValues.has(name)) {
      throw new Error(`Value ${name} already exists in scope ${this.name}`);
    }
    this.trackedValues.set(name, value);
  }

  getTrackedValue(name: string): TrackedValue {
    let value = this.trackedValues.get(name);
    if (value) return value;
    if (this.parent) {
      value = this.parent.getTrackedValue(name);
      if (value) return value;
    }
    if (this.architecture) {
      value = this.architecture.getPortTrackedValue(name);
      if (value) return value;
    }
    throw new Error(`Value ${name} not found in scope ${this.name}`);
  }

  getCurrentValue(target: Target): BaseValue<any> {
    const trackedValue = target.getValue(this);
    return trackedValue.current;
  }

  getProjectedValue(target: Target): BaseValue<any> | null {
    const trackedValue = target.getValue(this);
    return trackedValue.projected;
  }

  setProjectedValue(target: Target, value: BaseValue<any>) {
    const trackedValue = target.getValue(this);
    trackedValue.setProjected(value);
  }

  execute() {
    for (const statement of this.statements) {
      statement.run(this);
    }
    for (const child of this.childScopes) {
      child.execute();
    }
  }

  commit(): boolean {
    let deltaChange = false;
    for (const [, trackedValue] of this.trackedValues) {
      if (trackedValue.commit()) deltaChange = true;
    }
    for (const statement of this.statements) {
      if (statement.commit(this)) deltaChange = true;
    }
    for (const child of this.childScopes) {
      if (child.commit()) deltaChange = true;
    }
    return deltaChange;
  }

  postStep() {
    for (const statement of this.statements) {
      statement.postStep(this);
    }
    for (const child of this.childScopes) {
      child.postStep();
    }
  }

  clone(): this {
    const newScope = new Scope(this.name);
    for (const [name, trackedValue] of this.trackedValues) {
      newScope.trackedValues.set(name, new TrackedValue(trackedValue.type, trackedValue.current));
    }
    for (const statement of this.statements) {
      newScope.statements.push(statement.clone());
    }
    return newScope as this;
  }
}
