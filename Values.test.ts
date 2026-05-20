import { describe, it, expect, beforeEach } from "bun:test";
import {
  BaseValue,
  BitValue,
  IntValue,
  StringValue,
  ArrayValue,
  ProjectedValue,
  OutProjectedValue,
  UnknownValue,
} from "./Values";
import { BitType, IntType, StringType, ArrayType, UnknownType } from "./Types";

describe("Value Classes", () => {
  describe("BitValue", () => {
    it("should create BitValue from boolean", () => {
      const bit1 = new BitValue(true);
      const bit0 = new BitValue(false);
      expect(bit1.value).toBe(true);
      expect(bit0.value).toBe(false);
    });

    it("should create BitValue from 0 and 1", () => {
      const bit1 = new BitValue(1);
      const bit0 = new BitValue(0);
      expect(bit1.value).toBe(true);
      expect(bit0.value).toBe(false);
    });

    it("should return BitType", () => {
      const bit = new BitValue(true);
      expect(bit.getType()).toBe(BitType);
    });

    it("should format as '1' or '0'", () => {
      expect(new BitValue(true).toString()).toBe("1");
      expect(new BitValue(false).toString()).toBe("0");
    });

    it("should clone correctly", () => {
      const original = new BitValue(true);
      const cloned = original.clone();
      expect(cloned.value).toBe(true);
      expect(cloned).not.toBe(original);
    });

    it("should compare equality with same value", () => {
      const bit1 = new BitValue(true);
      const bit2 = new BitValue(true);
      expect(bit1.equals(bit2)).toBe(true);
    });

    it("should compare inequality with different value", () => {
      const bit1 = new BitValue(true);
      const bit0 = new BitValue(false);
      expect(bit1.equals(bit0)).toBe(false);
    });
  });

  describe("IntValue", () => {
    it("should create IntValue with number", () => {
      const int = new IntValue(42);
      expect(int.value).toBe(42);
    });

    it("should handle negative numbers", () => {
      const int = new IntValue(-100);
      expect(int.value).toBe(-100);
    });

    it("should return IntType", () => {
      const int = new IntValue(42);
      expect(int.getType()).toBe(IntType);
    });

    it("should format as decimal string", () => {
      expect(new IntValue(42).toString()).toBe("42");
      expect(new IntValue(-10).toString()).toBe("-10");
    });

    it("should clone correctly", () => {
      const original = new IntValue(123);
      const cloned = original.clone();
      expect(cloned.value).toBe(123);
      expect(cloned).not.toBe(original);
    });

    it("should compare equality", () => {
      const int1 = new IntValue(42);
      const int2 = new IntValue(42);
      expect(int1.equals(int2)).toBe(true);
    });

    it("should compare inequality", () => {
      const int1 = new IntValue(42);
      const int2 = new IntValue(43);
      expect(int1.equals(int2)).toBe(false);
    });
  });

  describe("StringValue", () => {
    it("should create StringValue with string", () => {
      const str = new StringValue("hello");
      expect(str.value).toBe("hello");
    });

    it("should return StringType", () => {
      const str = new StringValue("test");
      expect(str.getType()).toBe(StringType);
    });

    it("should format with quotes", () => {
      expect(new StringValue("hello").toString()).toBe('"hello"');
    });

    it("should escape quotes in string", () => {
      expect(new StringValue('say "hi"').toString()).toBe('"say \\"hi\\""');
    });

    it("should clone correctly", () => {
      const original = new StringValue("test");
      const cloned = original.clone();
      expect(cloned.value).toBe("test");
      expect(cloned).not.toBe(original);
    });

    it("should compare equality", () => {
      const str1 = new StringValue("hello");
      const str2 = new StringValue("hello");
      expect(str1.equals(str2)).toBe(true);
    });
  });

  describe("ArrayValue", () => {
    it("should create ArrayValue with elements", () => {
      const elements = [
        new BitValue(true),
        new BitValue(false),
        new BitValue(true),
      ];
      const array = new ArrayValue(elements);
      expect(array.value.length).toBe(3);
      expect(array.value[0]!.current.value).toBe(true);
      expect(array.value[1]!.current.value).toBe(false);
      expect(array.value[2]!.current.value).toBe(true);
    });

    it("should return ArrayType", () => {
      const elements = [new BitValue(true), new BitValue(false)];
      const array = new ArrayValue(elements);
      const type = array.getType();
      expect(type).toBeInstanceOf(ArrayType);
    });

    it("should format as comma and space separated values in brackets", () => {
      const elements = [new BitValue(true), new BitValue(false)];
      const array = new ArrayValue(elements);
      expect(array.toString()).toBe("[1, 0]");
    });

    it("should clone correctly", () => {
      const elements = [new BitValue(true), new BitValue(false)];
      const original = new ArrayValue(elements);
      const cloned = original.clone();
      expect(cloned.value.length).toBe(2);
      expect(cloned).not.toBe(original);
      expect(cloned.value[0]!.current.value).toBe(true);
      expect(cloned.value[1]!.current.value).toBe(false);
    });

    it("should compare equality with same elements", () => {
      const array1 = new ArrayValue([new BitValue(true), new BitValue(false)]);
      const array2 = new ArrayValue([new BitValue(true), new BitValue(false)]);
      expect(array1.equals(array2)).toBe(true);
    });

    it("should throw error when array elements have inconsistent types", () => {
      expect(() => {
        new ArrayValue([new BitValue(true), new IntValue(5)] as any);
      }).toThrow("Array element type mismatch");
    });
  });

  describe("ProjectedValue", () => {
    it("should initialize with current value", () => {
      const bit = new BitValue(true);
      const projected = new ProjectedValue(bit);
      expect(projected.current).toBe(bit);
      expect(projected.projected).toBeNull();
    });

    it("should set projected value", () => {
      const current = new BitValue(true);
      const future = new BitValue(false);
      const projected = new ProjectedValue(current);
      projected.setProjected(future);
      expect(projected.projected).toBe(future);
    });

    it("should not overwrite existing projection on second set", () => {
      const current = new BitValue(true);
      const future1 = new BitValue(false);
      const future2 = new BitValue(true);
      const projected = new ProjectedValue(current);
      projected.setProjected(future1);
      projected.setProjected(future2);
      expect(projected.projected).toBe(UnknownValue);
    });

    it("should commit changes correctly", () => {
      const current = new BitValue(true);
      const future = new BitValue(false);
      const projected = new ProjectedValue(current);
      projected.setProjected(future);
      const changed = projected.commit();
      expect(changed).toBe(true);
      expect(projected.current).toBe(future);
      expect(projected.projected).toBeNull();
    });

    it("should not report change if values are equal", () => {
      const value = new BitValue(true);
      const projected = new ProjectedValue(value);
      const sameBit = new BitValue(true);
      projected.setProjected(sameBit);
      const changed = projected.commit();
      expect(changed).toBe(false);
      expect(projected.projected).toBeNull();
    });
  });

  describe("OutProjectedValue", () => {
    it("should call callback on commit when changed", () => {
      let callbackValue: BaseValue<any> | null = null;
      const cb = (val: BaseValue<any>) => {
        callbackValue = val;
      };
      const current = new BitValue(true);
      const future = new BitValue(false);
      const projected = new OutProjectedValue(current, cb);
      projected.setProjected(future);
      projected.commit();
      expect(callbackValue as BaseValue<any> | null).toBe(future);
    });

    it("should not call callback if no change", () => {
      let called = false;
      const cb = () => {
        called = true;
      };
      const current = new BitValue(true);
      const projected = new OutProjectedValue(current, cb);
      const sameBit = new BitValue(true);
      projected.setProjected(sameBit);
      projected.commit();
      expect(called).toBe(false);
    });
  });

  describe("UnknownValue", () => {
    it("should return UnknownType", () => {
      expect(UnknownValue.getType()).toBe(UnknownType);
    });

    it("should format as 'x'", () => {
      expect(UnknownValue.toString()).toBe("x");
    });

    it("should clone to itself (singleton-like)", () => {
      expect(UnknownValue.clone()).toBe(UnknownValue);
    });
  });
});
