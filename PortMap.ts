import type { Architecture } from "./Architecture";
import type { Cloneable } from "./Cloneable";
import { Component } from "./Component";
import type { Entity } from "./Entity";
import { getIndent, type FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import { NamedTarget, Target } from "./Target";

export class PortMap implements Formattable, Cloneable {
  public component: Component;
  public parentArchitecture: Architecture | null = null;
  public entityArchitectures: Architecture[] = [];

  constructor(
    public entity: Entity,
    public portMap: Map<string, Target>,
  ) {
    this.component = new Component(
      entity,
      new Map(
        Array.from(entity.inPorts.entries()).map(([portName, port]) => {
          const mappedTarget = portMap.get(portName);
          if (!mappedTarget) {
            throw new Error(
              `Missing port mapping for input port ${portName} in entity ${entity.name}`,
            );
          }
          const cb = () => {
            if (!this.parentArchitecture) {
              throw new Error(
                `PortMap component input callback called before architecture is set`,
              );
            }
            return mappedTarget.getValue(this.parentArchitecture!);
          };
          return [portName, cb];
        }),
      ),
      new Map(
        Array.from(entity.outPorts.entries()).map(([portName, port]) => {
          const mappedTarget = portMap.get(portName);
          if (!mappedTarget) {
            console.warn(
              `Missing port mapping for output port ${portName} in entity ${entity.name}`,
            );
          }
          const cb = (val: any) => {
            if (!this.parentArchitecture) {
              console.warn(
                `PortMap component output callback called before architecture is set`,
              );
              return;
            }
            if (!mappedTarget) return;
            this.parentArchitecture.setProjectedValue(mappedTarget, val);
          };
          return [portName, cb];
        }),
      ),
    );

    this.entityArchitectures = Array.from(
      this.entity.architectures
        .values()
        .map((arch) => arch.withComponent(this.component)),
    );
  }

  run(): void {
    for (const arch of this.entityArchitectures) {
      arch.execute();
    }
  }

  commit(): boolean {
    let delta = false;
    for (const arch of this.entityArchitectures) {
      arch.commit();
      if (arch.deltaChange) delta = true;
    }
    return delta;
  }

  postStep(): void {
    for (const arch of this.entityArchitectures) {
      arch.postStep();
    }
  }

  toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    const mappingsStr = Array.from(this.portMap.entries())
      .map(([portName, signalName]) => `${portName} => ${signalName}`)
      .join(", ");
    return `${indent}port map (${mappingsStr})`;
  }

  clone(): this {
    const cloned = new PortMap(this.entity, new Map(this.portMap));
    return cloned as this;
  }
}
