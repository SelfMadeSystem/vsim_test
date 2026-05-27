import { Architecture } from "./Architecture";
import {
  ConcurrentPrintStatement,
  ConcurrentIfStatement,
} from "./ConcurrentStatement";
import { Entity } from "./Entity";
import {
  BinaryExpression,
  BinaryOperator,
  LiteralExpression,
  SignalExpression,
} from "./Expression";
import { GlobalScope } from "./Scope";
import { NamedTarget } from "./Target";
import { IntType } from "./Types";
import { IntValue, StringValue } from "./Values";

const global = new GlobalScope();

const entity = new Entity("Entity", [], global);

const arch = new Architecture("Arch", entity);

arch.addSignalDef("test", IntType, new IntValue(0));

arch.addConcurrentStatement(
  new ConcurrentIfStatement(
    [
      {
        condition: new BinaryExpression(
          new SignalExpression(new NamedTarget("test")),
          BinaryOperator.EQUALS,
          new LiteralExpression(new IntValue(0)),
        ),
        statements: [
          new ConcurrentPrintStatement(
            new LiteralExpression(new StringValue("Test is 0")),
          ),
        ],
      },
      {
        condition: new BinaryExpression(
          new SignalExpression(new NamedTarget("test")),
          BinaryOperator.EQUALS,
          new LiteralExpression(new IntValue(1)),
        ),
        statements: [
          new ConcurrentPrintStatement(
            new LiteralExpression(new StringValue("Test is 1")),
          ),
        ],
      },
    ],
    [
      new ConcurrentPrintStatement(
        new LiteralExpression(new StringValue("Test is neither 0 nor 1")),
      ),
    ],
  ),
);

global.setArchitecture(arch);

console.log(global.toString());

global.step();
