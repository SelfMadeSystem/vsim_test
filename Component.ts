import type { Entity } from "./Entity";
import { BaseValue, ProjectedValue } from "./Values";

export class Component {
  constructor(
    public entity: Entity,
    public inCbs: Map<string, () => ProjectedValue>,
    public outCbs: Map<string, (val: BaseValue<any>) => void>,
  ) {
    for (const inPort of entity.inPorts.values()) {
      if (!inCbs.has(inPort.name)) {
        throw new Error(`Missing input callback for port ${inPort.name}`);
      }
    }
  }

  public getInput(name: string): ProjectedValue | null {
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
}
