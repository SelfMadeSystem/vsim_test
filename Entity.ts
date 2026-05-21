import type { Architecture } from "./Architecture";
import { getIndent, indentCtx, type FmtContext } from "./FmtContext";
import type { Formattable } from "./Formattable";
import type { GlobalScope } from "./Scope";
import type { BaseType } from "./Types";

export abstract class Port implements Formattable {
  constructor(public name: string, public type: BaseType) {}
  abstract toString(fmt?: FmtContext): string;
}

export class InPort extends Port {
  toString(fmt?: FmtContext): string {
    return `in ${this.name}: ${this.type.toString()}`;
  }
}

export class OutPort extends Port {
  toString(fmt?: FmtContext): string {
    return `out ${this.name}: ${this.type.toString()}`;
  }
}

export class InOutPort extends Port {
  toString(fmt?: FmtContext): string {
    return `inout ${this.name}: ${this.type.toString()}`;
  }
}

export class Entity implements Formattable {
  public name: string;
  public architectures: Map<string, Architecture> = new Map();
  public inPorts: Map<string, InPort | InOutPort> = new Map();
  public outPorts: Map<string, OutPort | InOutPort> = new Map();

  constructor(name: string, ports: Port[], public globalScope: GlobalScope) {
    this.name = name;
    for (const port of ports) {
      if (port instanceof InPort || port instanceof InOutPort) {
        if (this.inPorts.has(port.name)) {
          throw new Error(`Duplicate input port name: ${port.name}`);
        }
        this.inPorts.set(port.name, port);
      }
      if (port instanceof OutPort || port instanceof InOutPort) {
        if (this.outPorts.has(port.name)) {
          throw new Error(`Duplicate output port name: ${port.name}`);
        }
        this.outPorts.set(port.name, port);
      }
    }
    this.globalScope.addEntity(this);
  }

  addArchitecture(arch: Architecture) {
    if (this.architectures.has(arch.name)) {
      throw new Error(
        `Architecture ${arch.name} already exists in entity ${this.name}`,
      );
    }
    this.architectures.set(arch.name, arch);
  }

  toString(fmt?: FmtContext): string {
    const indent = getIndent(fmt);
    const portsStr = [
      ...Array.from(this.inPorts.values()).map((p) => p.toString()),
      ...Array.from(this.outPorts.values()).filter((p) => !this.inPorts.has(p.name)).map((p) => p.toString()),
    ].join(";\n  " + indent);
    const archsStr = Array.from(this.architectures.values())
      .map((a) => a.toString(fmt))
      .join("\n\n" + indent);
    return `entity ${this.name} is\n${indent}  ${portsStr};\nend entity;\n\n${archsStr}`;
  }
}
