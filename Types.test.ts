import { describe, it, expect } from "bun:test";
import {
  BaseType,
  BitType,
  IntType,
  StringType,
  ArrayType,
  UnknownType,
} from "./Types";
import { BitValue, IntValue, StringValue, ArrayValue } from "./Values";

describe("Type System", () => {
  describe("Primitive Types", () => {
    it("should identify BitType correctly", () => {
      const bit = new BitValue(true);
      expect(BitType.isType(bit)).toBe(true);
      expect(BitType.toString()).toBe("bit");
    });

    it("should identify IntType correctly", () => {
      const int = new IntValue(42);
      expect(IntType.isType(int)).toBe(true);
      expect(IntType.toString()).toBe("int");
    });

    it("should identify StringType correctly", () => {
      const str = new StringValue("hello");
      expect(StringType.isType(str)).toBe(true);
      expect(StringType.toString()).toBe("string");
    });

    it("should recognize UnknownType for any value", () => {
      expect(UnknownType.isType(new BitValue(true))).toBe(true);
      expect(UnknownType.isType(new IntValue(10))).toBe(true);
      expect(UnknownType.toString()).toBe("unknown");
    });

    it("should show types are equal when same type", () => {
      const bit1 = BitType;
      const bit2 = BitType;
      expect(bit1.equals(bit2)).toBe(true);
    });

    it("should show types are not equal when different", () => {
      expect(BitType.equals(IntType)).toBe(false);
      expect(IntType.equals(StringType)).toBe(false);
    });
  });

  describe("ArrayType", () => {
    it("should create array type with ascending range", () => {
      const arrayType = new ArrayType(BitType, 0, 7);
      expect(arrayType.elementType).toBe(BitType);
      expect(arrayType.start).toBe(0);
      expect(arrayType.end).toBe(7);
      expect(arrayType.downto).toBe(false);
      expect(arrayType.length).toBe(8);
    });

    it("should create array type with descending range", () => {
      const arrayType = new ArrayType(IntType, 15, 0, true);
      expect(arrayType.start).toBe(15);
      expect(arrayType.end).toBe(0);
      expect(arrayType.downto).toBe(true);
      expect(arrayType.length).toBe(16);
    });

    it("should format array type to string", () => {
      const arrayType = new ArrayType(BitType, 0, 7);
      expect(arrayType.toString()).toBe("array(0 to 7) of bit");
    });

    it("should format downto direction correctly", () => {
      const arrayType = new ArrayType(IntType, 31, 0, true);
      expect(arrayType.toString()).toBe("array(31 downto 0) of int");
    });

    it("should recognize array values of correct type", () => {
      const arrayType = new ArrayType(BitType, 0, 3);
      const bits = [
        new BitValue(true),
        new BitValue(false),
        new BitValue(true),
        new BitValue(false),
      ];
      const arrayValue = new ArrayValue(bits);
      expect(arrayType.isType(arrayValue)).toBe(true);
    });

    it("should reject array values of wrong length", () => {
      const arrayType = new ArrayType(BitType, 0, 3);
      const bits = [new BitValue(true), new BitValue(false)];
      const arrayValue = new ArrayValue(bits);
      expect(arrayType.isType(arrayValue)).toBe(false);
    });

    it("should reject array values of wrong element type", () => {
      const arrayType = new ArrayType(BitType, 0, 1);
      const values = [new IntValue(1), new IntValue(2)];
      const arrayValue = new ArrayValue(values);
      expect(arrayType.isType(arrayValue)).toBe(false);
    });

    it("should compare array types for equality", () => {
      const array1 = new ArrayType(BitType, 0, 7);
      const array2 = new ArrayType(BitType, 0, 7);
      const array3 = new ArrayType(BitType, 0, 15);
      expect(array1.equals(array2)).toBe(true);
      expect(array1.equals(array3)).toBe(false);
    });

    it("should distinguish between to and downto", () => {
      const toArray = new ArrayType(BitType, 0, 7, false);
      const downtoArray = new ArrayType(BitType, 0, 7, true);
      expect(toArray.equals(downtoArray)).toBe(false);
    });
  });
});
