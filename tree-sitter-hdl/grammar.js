/**
 * @file Hardware Description Language
 * @author SelfMadeSystem <sms@shoghisimon.ca>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "hdl",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
