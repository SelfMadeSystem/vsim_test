import Parser from "tree-sitter";
import HDL from "./tree-sitter-hdl";

export function createParser() {
  const parser = new Parser();
  parser.setLanguage(HDL);
  return parser;
}

export function parse(code: string) {
  const parser = createParser();
  return parser.parse(code);
}

if (import.meta.main) {
  const code = `
entity AND2 is
  port (
    A : in std_logic;
    B : in std_logic;
    Y : out std_logic
  );
end AND2;

architecture Behavioral of AND2 is
begin
  Y <= A and B;
end Behavioral;
  `;

  const tree = parse(code);
  console.log(tree.rootNode.toString());
}
