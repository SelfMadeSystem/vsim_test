export type FmtContext = {
  indentLevel: number;
};

export function indentCtx(context?: FmtContext): FmtContext | undefined {
  if (!context) return undefined;
  return { indentLevel: context.indentLevel + 1 };
}

export function dedentCtx(context?: FmtContext): FmtContext | undefined {
  if (!context) return undefined;
  return { indentLevel: Math.max(0, context.indentLevel - 1) };
}

export function getIndent(context?: FmtContext): string {
  return "  ".repeat(context?.indentLevel ?? 0);
}
