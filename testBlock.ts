import { Architecture } from "./Architecture";
import { ProcessStatement, PrintStatement, BlockStatement } from "./ConcurrentStatement";
import { Entity } from "./Entity";
import { LiteralExpression, SignalExpression } from "./Expression";
import { GlobalScope } from "./Scope";
import { IndexedTarget, NamedTarget } from "./Target";
import { BitType } from "./Types";
import { BitValue } from "./Values";

const global = new GlobalScope();

const entity = new Entity("Entity", [], global);

const arch = new Architecture("Arch", entity);

const block = new BlockStatement([
  new PrintStatement(new SignalExpression(new NamedTarget("test"))),
]);

block.addSignalDef("test", BitType, new BitValue(1));

arch.addConcurrentStatement(block);

global.setArchitecture(arch);

console.log(global.toString());

global.step();
