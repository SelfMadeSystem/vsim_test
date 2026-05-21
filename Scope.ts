import type { Architecture } from "./Architecture";
import type { Cloneable } from "./Cloneable";
import type { ConcurrentStatement } from "./ConcurrentStatement";
import { MAX_DELTA_CYCLES } from "./Consts";
import type { Entity } from "./Entity";
import type { Target } from "./Target";
import { TrackedValue, type BaseValue } from "./Values";

export class Scope implements Cloneable {
  public trackedValues: Map<string, TrackedValue> = new Map();
  public parent: Scope | null = null;
  public architecture: Architecture | null = null;
  public childScopes: Set<Scope> = new Set();
  public statements: ConcurrentStatement[] = [];

  constructor(public name: string, public globalScope: GlobalScope) {}

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
  
  setImmediately(target: Target, value: BaseValue<any>) {
    const trackedValue = target.getValue(this);
    trackedValue.current = value;
    trackedValue.projected = null;
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

  postCycle() {
    for (const statement of this.statements) {
      statement.postCycle(this);
    }
    for (const child of this.childScopes) {
      child.postCycle();
    }
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
    const newScope = new Scope(this.name, this.globalScope);
    for (const [name, trackedValue] of this.trackedValues) {
      newScope.trackedValues.set(
        name,
        new TrackedValue(trackedValue.type, trackedValue.current),
      );
    }
    for (const statement of this.statements) {
      newScope.statements.push(statement.clone());
    }
    return newScope as this;
  }
}

export class GlobalScope {
  public trackedValues: Map<string, TrackedValue> = new Map();
  public entities: Map<string, Entity> = new Map();
  public architecture: Architecture | null = null;

  public timeStep = 0;
  public deltaCycle = 0;

  setArchitecture(arch: Architecture) {
    this.architecture = arch;
  }

  addEntity(entity: Entity) {
    if (this.entities.has(entity.name)) {
      throw new Error(`Entity ${entity.name} already exists in global scope`);
    }
    this.entities.set(entity.name, entity);
  }

  cycle(): boolean {
    this.execute();
    const deltaChange = this.commit();
    this.postCycle();
    this.deltaCycle++;
    return deltaChange;
  }

  execute() {
    this.architecture?.execute();
  }

  commit(): boolean {
    return this.architecture?.commit() ?? false;
  }

  postCycle() {
    this.architecture?.postCycle();
  }

  postStep() {
    this.architecture?.postStep();
  }

  step() {
    this.deltaCycle = 0;
    while (this.deltaCycle < MAX_DELTA_CYCLES && this.cycle());
    if (this.deltaCycle >= MAX_DELTA_CYCLES) {
      throw new Error(
        `Simulation did not stabilize after ${MAX_DELTA_CYCLES} delta cycles`,
      );
    }
    this.timeStep++;
    this.postStep();
  }
}
