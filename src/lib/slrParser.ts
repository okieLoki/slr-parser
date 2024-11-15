import { IGrammarRule, ITransition } from "@/types/slrParserTypes";

class SLRParser {
  private grammar: IGrammarRule[];
  private states: string[][] = [];
  private transitions: ITransition[] = [];
  private actionTable: { [key: string]: string } = {};
  private gotoTable: { [key: string]: string } = {};

  constructor(grammar: IGrammarRule[]) {
    this.grammar = grammar;
  }

  private closure(items: string[]): string[] {
    let closureSet = new Set(items);
    let added = true;

    while (added) {
      added = false;
      for (let item of closureSet) {
        const [_, dotBody] = item.split(" -> ");
        const bodyParts = dotBody.split(" ");
        const dotIndex = bodyParts.indexOf(".");

        if (dotIndex < bodyParts.length - 1) {
          const nextSymbol = bodyParts[dotIndex + 1];
          for (let rule of this.grammar) {
            if (rule.head === nextSymbol) {
              const newItem = `${rule.head} -> . ${rule.body.join(" ")}`;
              if (!closureSet.has(newItem)) {
                closureSet.add(newItem);
                added = true;
              }
            }
          }
        }
      }
    }
    return Array.from(closureSet);
  }

  private goto(items: string[], symbol: string): string[] {
    let movedItems: string[] = [];
    for (let item of items) {
      const [head, dotBody] = item.split(" -> ");
      const bodyParts = dotBody.split(" ");
      const dotIndex = bodyParts.indexOf(".");

      if (
        dotIndex < bodyParts.length - 1 &&
        bodyParts[dotIndex + 1] === symbol
      ) {
        const newBodyParts = [...bodyParts];
        newBodyParts[dotIndex] = newBodyParts[dotIndex + 1];
        newBodyParts[dotIndex + 1] = ".";
        movedItems.push(`${head} -> ${newBodyParts.join(" ")}`);
      }
    }
    return this.closure(movedItems);
  }

  private computeStates(): void {
    const startState = this.closure([
      `${this.grammar[0].head} -> . ${this.grammar[0].body.join(" ")}`,
    ]);
    this.states = [startState];
    let i = 0;

    while (i < this.states.length) {
      const symbols = new Set<string>();
      for (let item of this.states[i]) {
        const [_, dotBody] = item.split(" -> ");
        const bodyParts = dotBody.split(" ");
        const dotIndex = bodyParts.indexOf(".");

        if (dotIndex < bodyParts.length - 1) {
          symbols.add(bodyParts[dotIndex + 1]);
        }
      }

      for (let symbol of symbols) {
        const newState = this.goto(this.states[i], symbol);
        if (newState.length > 0) {
          let existingIndex = this.states.findIndex(
            (state) => JSON.stringify(state) === JSON.stringify(newState)
          );
          if (existingIndex === -1) {
            this.states.push(newState);
            existingIndex = this.states.length - 1;
          }
          this.transitions.push({ from: i, to: existingIndex, symbol });

          if (/^[A-Z]$/.test(symbol)) {
            this.gotoTable[`I${i},${symbol}`] = `I${existingIndex}`;
          } else {
            this.actionTable[`I${i},${symbol}`] = `S${existingIndex}`;
          }
        }
      }

      for (let item of this.states[i]) {
        if (item.endsWith(".")) {
          const [head, body] = item.slice(0, -1).split(" -> ");
          if (head === this.grammar[0].head) {
            this.actionTable[`I${i},$`] = "Accept";
          } else {
            this.grammar.forEach((rule, index) => {
              if (rule.head === head && rule.body.join(" ") === body.trim()) {
                this.actionTable[`I${i},$`] = `R${index}`;
              }
            });
          }
        }
      }

      for (let item of this.states[i]) {
        if (item.endsWith(".")) {
          const [head, body] = item.slice(0, -1).split(" -> ");
          this.grammar.forEach((rule, index) => {
            if (rule.head === head && rule.body.join(" ") === body.trim()) {
              this.grammar[0].body.forEach((symbol) => {
                if (!this.actionTable[`I${i},${symbol}`]) {
                  this.actionTable[`I${i},${symbol}`] = `R${index}`;
                }
              });
            }
          });
        }
      }

      i++;
    }
  }

  private getActionTableJson(): object[] {
    const symbols = new Set<string>();
    for (let rule of this.grammar) {
      rule.body.forEach((symbol) => symbols.add(symbol));
    }
    symbols.add("$");

    const table: object[] = [];

    for (let i = 0; i < this.states.length; i++) {
      const row: { state: string; [key: string]: string } = {
        state: String(i),
      };
      for (let symbol of symbols) {
        row[symbol] = this.actionTable[`I${i},${symbol}`] || "";
      }
      table.push(row);
    }

    return table;
  }

  private getGotoTableJson(): object[] {
    const symbols = new Set<string>();
    for (let rule of this.grammar) {
      symbols.add(rule.head);
    }

    const table: object[] = [];

    for (let i = 0; i < this.states.length; i++) {
      const row: { state: string; [key: string]: string } = {
        state: String(i),
      };
      for (let symbol of symbols) {
        row[symbol] = this.gotoTable[`I${i},${symbol}`] || "";
      }
      table.push(row);
    }

    return table;
  }

  public parse(): {
    states: string[][];
    transitions: ITransition[];
    actionTable: object[];
    gotoTable: object[];
  } {
    this.computeStates();

    return {
      states: this.states,
      transitions: this.transitions,
      actionTable: this.getActionTableJson(),
      gotoTable: this.getGotoTableJson(),
    };
  }
}

export { SLRParser };
