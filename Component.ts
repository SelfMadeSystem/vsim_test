import type { Cloneable } from "./Cloneable";
import type { Entity } from "./Entity";
import { BaseValue, TrackedValue } from "./Values";

export class Component implements Cloneable {
  constructor(
    public entity: Entity,
    public inCbs: Map<string, () => BaseValue<any>>,
    public outCbs: Map<string, (val: BaseValue<any>) => void>,
  ) {
    for (const inPort of entity.inPorts.values()) {
      if (!inCbs.has(inPort.name)) {
        throw new Error(`Missing input callback for port ${inPort.name}`);
      }
    }
  }

  public getInput(name: string): BaseValue<any> | null {
    const cb = this.inCbs.get(name);
    if (!cb) {
      return null;
    }
    return cb();
  }

  public setOutput(name: string, value: BaseValue<any>): boolean {
    const cb = this.outCbs.get(name);
    if (!cb) {
      // Return true if the port exists but has no callback, false if it doesn't exist
      return this.entity.outPorts.has(name);
    }
    cb(value);
    return true;
  }

  clone(): this {
    return new Component(this.entity, this.inCbs, this.outCbs) as this;
  }
}
