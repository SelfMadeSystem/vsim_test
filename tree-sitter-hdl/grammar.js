/**
 * @file Hardware Description Language
 * @author SelfMadeSystem <sms@shoghisimon.ca>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

/**
 * Matches zero or more occurrences of `rule` separated by `separator`.
 * @param {RuleOrLiteral} rule
 * @param {string} separator
 * @returns {Rule}
 */
function sep(rule, separator) {
  return optional(seq(rule, repeat(seq(separator, rule))));
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
        field("name", $.identifier),
        field(
          "ports",
          optional(
            seq("is", "port", "(", sep($.port_declaration, ";"), ")", ";"),
          ),
        ),
        "end",
        optional(choice("entity", $.identifier, seq("entity", $.identifier))),
        ";",
      ),

    port_declaration: $ =>
      seq(
        field("name", $.identifier),
        ":",
        field("direction", $.port_direction),
        field("type", $.type),
      ),

    port_direction: $ => choice("in", "out", "inout"),

    type: $ => choice($.identifier, $.array_type),

    array_type: $ =>
      seq(
        "array",
        "(",
        field("range", $.range),
        ")",
        "of",
        field("type", $.type),
      ),

    range: $ =>
      seq(
        field("left", $.expression),
        field("operator", choice("to", "downto")),
        field("right", $.expression),
      ),

    expression: $ =>
      choice(
        $.identifier,
        $.number,
        seq("(", $.expression, ")"),
        prec.left(
          2,
          seq(
            field("left", $.expression),
            field("operator", $.binary_operator),
            field("right", $.expression),
          ),
        ),
        seq(
          field("operator", $.unary_operator),
          field("operand", $.expression),
        ),
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
        field("name", $.identifier),
        "of",
        field("entity", $.identifier),
        "is",
        field("declarations", repeat($._declaration)),
        "begin",
        field("statements", repeat($._concurrent_statement)),
        "end",
        optional(
          choice(
            "architecture",
            $.identifier,
            seq("architecture", $.identifier),
          ),
        ),
        ";",
      ),

    _declaration: $ => choice($.signal_declaration),

    signal_declaration: $ =>
      seq(
        "signal",
        field("name", $.identifier),
        ":",
        field("type", $.type),
        optional(seq(":=", field("initial_value", $.expression))),
        ";",
      ),

    _concurrent_statement: $ => choice($.signal_assignment, $.process),

    signal_assignment: $ =>
      seq(
        field("target", $.identifier),
        "<=",
        field("value", $.expression),
        ";",
      ),

    variable_assignment: $ =>
      seq(
        field("target", $.identifier),
        ":=",
        field("value", $.expression),
        ";",
      ),

    process: $ =>
      seq(
        "process",
        field(
          "sensitivity_list",
          optional(seq("(", sep($.identifier, ","), ")")),
        ),
        "begin",
        field("statements", repeat($._sequential_statement)),
        "end",
        "process",
        ";",
      ),

    _sequential_statement: $ =>
      choice($.signal_assignment, $.variable_assignment),
  },
});
