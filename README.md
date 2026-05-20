# vsim_test

An experimental VHDL simulator implemented in TypeScript with support for entities, architectures, concurrent statements, and signal evaluation. More to come!

## Overview

This project provides a framework for simulating VHDL designs in TypeScript/JavaScript. It supports:

- **Entity definitions** with input, output, and bidirectional ports
- **Architecture implementations** with concurrent signal assignments
- **Type system** for bit values, integers, strings, and arrays
- **Expression evaluation** with binary operators (AND, OR, XOR, NAND)
- **Signal simulation** with projected values and delta cycles
- **Component instantiation** with input/output callbacks

## Project Structure

### Core Modules

- **Entity.ts** - Defines ports (InPort, OutPort, InOutPort) and entities with port collections
- **Architecture.ts** - Manages signal definitions, concurrent statements, and simulation stepping
- **Types.ts** - Type system including BitType, IntType, StringType, and ArrayType
- **Values.ts** - Value classes (BitValue, IntValue, StringValue, ArrayValue) and ProjectedValue for signal state
- **Expression.ts** - Expression evaluation with SignalExpression, LiteralExpression, and BinaryOperator
- **Target.ts** - Signal targets (SignalTarget, IndexedTarget) for assignment destinations
- **ConcurrentStatement.ts** - Signal assignment statements for architecture behavior
- **Component.ts** - Component instantiation with input/output callback mappings
- **FmtContext.ts** - Formatting context for VHDL output generation

### Supporting Modules

- **Cloneable.ts** - Interface for objects that can be cloned
- **Formattable.ts** - Interface for objects that can be formatted to strings
- **Consts.ts** - Project constants

## Example Usage

```typescript
// Create an entity with ports
const entity = new Entity("FullAdder", [
  new InPort("a", BitType),
  new InPort("b", BitType),
  new InPort("carryIn", BitType),
  new OutPort("sum", BitType),
  new OutPort("carryOut", BitType),
]);

// Create an architecture
const arch = new Architecture("Behavioral", entity);

// Add concurrent statements (signal assignments)
arch.addConcurrentStatement(
  new SignalAssignment(
    new SignalTarget("sum"),
    new BinaryExpression(
      new SignalExpression(new SignalTarget("a")),
      BinaryOperator.XOR,
      new BinaryExpression(
        new SignalExpression(new SignalTarget("b")),
        BinaryOperator.XOR,
        new SignalExpression(new SignalTarget("carryIn"))
      )
    )
  )
);

// Link entity and architecture
entity.addArchitecture(arch);

// Create component with input/output mappings
const bits = [false, false, false];
const component = new Component(
  entity,
  new Map([
    ["a", () => new ProjectedValue(new BitValue(bits[0]))],
    ["b", () => new ProjectedValue(new BitValue(bits[1]))],
    ["carryIn", () => new ProjectedValue(new BitValue(bits[2]))],
  ]),
  new Map([
    ["sum", (val) => console.log(`sum: ${val.toString()}`)],
    ["carryOut", (val) => console.log(`carryOut: ${val.toString()}`)],
  ])
);

// Simulate
const sim = arch.withComponent(component);
sim.step();
```

## Testing

This project includes comprehensive unit tests using **bun:test**:

- **Entity.test.ts** - Port creation, entity management, validation
- **Types.test.ts** - Type checking, array types, type equality
- **Values.test.ts** - Value creation, cloning, equality, ProjectedValues
- **Expression.test.ts** - Expression evaluation, binary operators
- **Target.test.ts** - Signal targets, indexed targets, lookups
- **Component.test.ts** - Component callbacks and port connections
- **ConcurrentStatement.test.ts** - Signal assignments and execution
- **Architecture.test.ts** - Simulation stepping, signal management, cloning
- **FmtContext.test.ts** - Formatting context and indentation
- **Integration.test.ts** - Full adder simulation end-to-end

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test Entity.test.ts
```

All tests pass with comprehensive coverage across all modules.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) or Node.js with TypeScript support
- TypeScript 5+

### Installation

```bash
# Install dependencies
bun install

# Or with npm
npm install
```

### Running

```bash
# Execute the example simulation
bun index.ts

# Or with Node.js
npx ts-node index.ts
```

## Key Features

- **Type Safety** - Full TypeScript implementation with strict typing
- **Signal Simulation** - Projected values and delta cycle support
- **Hierarchical Design** - Entities can contain multiple architectures
- **Expression Evaluation** - Complex nested expressions with type checking
- **VHDL Output** - Generate formatted VHDL from the simulation structure
- **Extensible** - Easy to add new value types and operators

## Architecture

The simulator follows a concurrent statement execution model typical of VHDL:

1. **Execute Phase** - All concurrent statements evaluate their expressions
2. **Commit Phase** - Signal projections are committed if values changed
3. **Delta Cycles** - The process repeats until no further changes occur

## License

MIT
