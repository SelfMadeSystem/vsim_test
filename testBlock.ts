import { Architecture } from "./Architecture";
import {
  ConcurrentPrintStatement,
  BlockStatement,
} from "./ConcurrentStatement";
import { Entity } from "./Entity";
import { SignalExpression } from "./Expression";
import { GlobalScope } from "./Scope";
import { NamedTarget } from "./Target";
import { BitType } from "./Types";
import { BitValue } from "./Values";

const global = new GlobalScope();

const entity = new Entity("Entity", [], global);

const arch = new Architecture("Arch", entity);

const block = new BlockStatement([
  new ConcurrentPrintStatement(new SignalExpression(new NamedTarget("test"))),
]);

block.addSignalDef("test", BitType, new BitValue(1));

arch.addConcurrentStatement(block);

global.setArchitecture(arch);

console.log(global.toString());

global.step();
