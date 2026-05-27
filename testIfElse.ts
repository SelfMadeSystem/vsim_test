import { Architecture } from "./Architecture";
import {
  ConcurrentPrintStatement,
  ConcurrentIfStatement,
  ProcessStatement,
} from "./ConcurrentStatement";
import { Entity } from "./Entity";
import {
  BinaryExpression,
  BinaryOperator,
  LiteralExpression,
  SignalExpression,
} from "./Expression";
import { GlobalScope } from "./Scope";
import { IfStatement, PrintStatement } from "./SequentialStatement";
import { NamedTarget } from "./Target";
import { IntType } from "./Types";
import { IntValue, StringValue } from "./Values";

const global = new GlobalScope();

const entity = new Entity("Entity", [], global);

const arch = new Architecture("Arch", entity);

arch.addSignalDef("test", IntType, new IntValue(2));

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

arch.addConcurrentStatement(
  new ProcessStatement(
    [new NamedTarget("test")],
    [
      new IfStatement(
        [
          {
            condition: new BinaryExpression(
              new SignalExpression(new NamedTarget("test")),
              BinaryOperator.EQUALS,
              new LiteralExpression(new IntValue(0)),
            ),
            statements: [
              new PrintStatement(
                new LiteralExpression(new StringValue("Process: Test is 0")),
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
              new PrintStatement(
                new LiteralExpression(new StringValue("Process: Test is 1")),
              ),
            ],
          },
        ],
        [
          new PrintStatement(
            new LiteralExpression(
              new StringValue("Process: Test is neither 0 nor 1"),
            ),
          ),
        ],
      ),
    ],
  ),
);

global.setArchitecture(arch);

console.log(global.toString());

global.step();
