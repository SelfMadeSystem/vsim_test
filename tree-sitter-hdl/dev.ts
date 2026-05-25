///<reference types="bun-types" />
import { watch } from "fs/promises";

const watcher = watch("./grammar.js");

const buildCmd = "tree-sitter generate && tree-sitter build --wasm";
const playgroundCmd = ["tree-sitter", "playground", "-q"];

await Bun.spawn(["sh", "-c", buildCmd]).exited;

let devProcess = Bun.spawn(playgroundCmd);

for await (const event of watcher) {
  if (event.eventType === "change") {
    devProcess.kill();
    await devProcess.exited;
    await Bun.spawn(["sh", "-c", buildCmd]).exited;
    devProcess = Bun.spawn(playgroundCmd);
  }
}
