import type { FmtContext } from "./FmtContext";

export interface Formattable {
  toString(fmt?: FmtContext): string;
}
