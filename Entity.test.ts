import { describe, it, expect, beforeEach } from "bun:test";
import { Entity, InPort, OutPort, InOutPort } from "./Entity";
import { BitType, IntType } from "./Types";
import { Architecture } from "./Architecture";

describe("Port Classes", () => {
  describe("InPort", () => {
    it("should create an InPort with name and type", () => {
      const port = new InPort("data", BitType);
      expect(port.name).toBe("data");
      expect(port.type).toBe(BitType);
    });

    it("should format as 'in name: type'", () => {
      const port = new InPort("clk", BitType);
      expect(port.toString()).toBe("in clk: bit");
    });
  });

  describe("OutPort", () => {
    it("should create an OutPort with name and type", () => {
      const port = new OutPort("result", IntType);
      expect(port.name).toBe("result");
      expect(port.type).toBe(IntType);
    });

    it("should format as 'out name: type'", () => {
      const port = new OutPort("sum", IntType);
      expect(port.toString()).toBe("out sum: int");
    });
  });

  describe("InOutPort", () => {
    it("should create an InOutPort with name and type", () => {
      const port = new InOutPort("bus", BitType);
      expect(port.name).toBe("bus");
      expect(port.type).toBe(BitType);
    });

    it("should format as 'inout name: type'", () => {
      const port = new InOutPort("data_bus", BitType);
      expect(port.toString()).toBe("inout data_bus: bit");
    });
  });
});

describe("Entity", () => {
  let entity: Entity;

  beforeEach(() => {
    entity = new Entity("TestEntity", [
      new InPort("a", BitType),
      new InPort("b", BitType),
      new OutPort("result", BitType),
    ]);
  });

  it("should create an entity with a name", () => {
    expect(entity.name).toBe("TestEntity");
  });

  it("should separate input ports correctly", () => {
    expect(entity.inPorts.size).toBe(2);
    expect(entity.inPorts.has("a")).toBe(true);
    expect(entity.inPorts.has("b")).toBe(true);
  });

  it("should separate output ports correctly", () => {
    expect(entity.outPorts.size).toBe(1);
    expect(entity.outPorts.has("result")).toBe(true);
  });

  it("should handle InOutPort as both input and output", () => {
    const entity2 = new Entity("BiDirectional", [
      new InOutPort("bus", BitType),
    ]);
    expect(entity2.inPorts.size).toBe(1);
    expect(entity2.outPorts.size).toBe(1);
    expect(entity2.inPorts.has("bus")).toBe(true);
    expect(entity2.outPorts.has("bus")).toBe(true);
  });

  it("should throw error on duplicate input port", () => {
    expect(() => {
      new Entity("Bad", [new InPort("x", BitType), new InPort("x", BitType)]);
    }).toThrow("Duplicate input port name: x");
  });

  it("should throw error on duplicate output port", () => {
    expect(() => {
      new Entity("Bad", [new OutPort("x", BitType), new OutPort("x", BitType)]);
    }).toThrow("Duplicate output port name: x");
  });

  it("should add architecture", () => {
    const arch = new Architecture("behavioral", entity);
    entity.addArchitecture(arch);
    expect(entity.architectures.has("behavioral")).toBe(true);
  });

  it("should throw error on duplicate architecture", () => {
    const arch = new Architecture("behavioral", entity);
    entity.addArchitecture(arch);
    expect(() => {
      entity.addArchitecture(arch);
    }).toThrow("Architecture behavioral already exists in entity TestEntity");
  });

  it("should format entity to VHDL string", () => {
    const str = entity.toString();
    expect(str).toContain("entity TestEntity is");
    expect(str).toContain("in a: bit");
    expect(str).toContain("in b: bit");
    expect(str).toContain("out result: bit");
    expect(str).toContain("end entity;");
  });

  it("should include architecture in toString when present", () => {
    const arch = new Architecture("rtl", entity);
    entity.addArchitecture(arch);
    const str = entity.toString();
    expect(str).toContain("architecture rtl of TestEntity");
  });
});
