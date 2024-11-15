export interface IGrammarRule {
  head: string;
  body: string[];
}

export interface ITransition {
  from: number;
  to: number;
  symbol: string;
}

export interface IGrammarRule {
  head: string;
  body: string[];
}

export interface IParsedData {
  states: string[][];
  transitions: Array<{
    from: number;
    to: number;
    symbol: string;
  }>;
  actionTable: Array<{
    state: number;
    [key: string]: string | number;
  }>;
  gotoTable: Array<{
    state: number;
    [key: string]: string | number;
  }>;
}