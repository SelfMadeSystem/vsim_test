/**
 * @file Hardware Description Language
 * @author SelfMadeSystem <sms@shoghisimon.ca>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

/**
 * Matches a comma-separated list of the given rule zero or more times.
 * @param {Rule} rule
 * @returns {Rule}
 */
function commaSep(rule) {
  return optional(seq(rule, repeat(seq(",", rule))));
}

export default grammar({
  name: "hdl",

  word: $ => $.identifier,

  extras: $ => [
    /\s|\\\r?\n/, // whitespace and line continuation
    $.comment,
  ],

  rules: {
    source_file: $ => repeat($._definition),

    comment: $ =>
      token(
        choice(
          seq("--", /.*/), // single-line comment
          seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"), // multi-line comment
        ),
      ),

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    number: $ => /\d+/,

    _definition: $ => choice($.entity, $.architecture),

    entity: $ =>
      seq(
        "entity",
        $.identifier,
        optional(
          seq("is", "port", "(", commaSep($.port_declaration), ")", ";"),
        ),
        "end",
        "entity",
        ";",
      ),

    port_declaration: $ =>
      seq($.identifier, ":", choice("in", "out", "inout"), $.type),

    type: $ => choice($.identifier, $.array_type),

    array_type: $ => seq("array", "(", $.range, ")", "of", $.type),

    range: $ => seq($.expression, choice("downto", "to"), $.expression),

    expression: $ =>
      choice(
        $.identifier,
        $.number,
        seq("(", $.expression, ")"),
        prec.left(2, seq($.expression, $.binary_operator, $.expression)),
        seq($.unary_operator, $.expression),
      ),

    binary_operator: $ =>
      choice(
        "+",
        "-",
        "*",
        "/",
        "mod",
        "rem",
        "and",
        "or",
        "xor",
        "nand",
        "nor",
        "xnor",
      ),

    unary_operator: $ => choice("+", "-", "not"),

    architecture: $ =>
      seq(
        "architecture",
        $.identifier,
        "of",
        $.identifier,
        "is",
        repeat($._declaration),
        "begin",
        repeat($._concurrent_statement),
        "end",
        "architecture",
        ";",
      ),

    _declaration: $ => choice($.signal_declaration),

    signal_declaration: $ => seq(
      "signal",
      $.identifier,
      ":",
      $.type,
      optional(seq(":=", $.expression)),
      ";",
    ),

    _concurrent_statement: $ => choice($.assignment, $.process),

    assignment: $ => seq($.identifier, "<=", $.expression, ";"),

    process: $ =>
      seq(
        "process",
        optional(seq("(", commaSep($.identifier), ")")),
        "begin",
        repeat($._sequential_statement),
        "end",
        "process",
        ";",
      ),

    _sequential_statement: $ => choice($.assignment),
  },
});
