import { IGrammarRule, ITransition } from "@/types/slrParserTypes";

class SLRParser {
  private grammar: IGrammarRule[];
  private states: string[][] = [];
  private transitions: ITransition[] = [];
  private actionTable: { [key: string]: string } = {};
  private gotoTable: { [key: string]: string } = {};
  private firstSets: { [key: string]: Set<string> } = {};
  private followSets: { [key: string]: Set<string> } = {};

  constructor(grammar: IGrammarRule[]) {
    this.grammar = grammar;
    this.computeFirstSets();
    this.computeFollowSets();
  }

  private isTerminal(symbol: string): boolean {
    return !/^[A-Z]$/.test(symbol);
  }

  private isNonTerminal(symbol: string): boolean {
    return /^[A-Z]$/.test(symbol);
  }

  private computeFirstSets(): void {
    for (let rule of this.grammar) {
      this.firstSets[rule.head] = new Set<string>();
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (let rule of this.grammar) {
        const head = rule.head;
        const body = rule.body;

        if (body.length === 0) {
          if (!this.firstSets[head].has("ε")) {
            this.firstSets[head].add("ε");
            changed = true;
          }
          continue;
        }

        const firstSymbol = body[0];
        if (this.isTerminal(firstSymbol)) {
          if (!this.firstSets[head].has(firstSymbol)) {
            this.firstSets[head].add(firstSymbol);
            changed = true;
          }
        } else {
          for (let symbol of body) {
            const symbolFirst = this.firstSets[symbol] || new Set<string>();
            for (let terminal of symbolFirst) {
              if (terminal !== "ε" && !this.firstSets[head].has(terminal)) {
                this.firstSets[head].add(terminal);
                changed = true;
              }
            }
            if (!symbolFirst.has("ε")) break;
          }
        }
      }
    }
  }

  private computeFollowSets(): void {
    for (let rule of this.grammar) {
      this.followSets[rule.head] = new Set<string>();
    }

    this.followSets[this.grammar[0].head].add("$");

    let changed = true;
    while (changed) {
      changed = false;
      for (let rule of this.grammar) {
        const head = rule.head;
        const body = rule.body;

        for (let i = 0; i < body.length; i++) {
          const currentSymbol = body[i];
          if (this.isNonTerminal(currentSymbol)) {
            const remaining = body.slice(i + 1);
            let addFollowOfHead = false;

            if (remaining.length === 0) {
              addFollowOfHead = true;
            } else {
              let allCanBeEmpty = true;
              for (let symbol of remaining) {
                if (this.isTerminal(symbol)) {
                  if (!this.followSets[currentSymbol].has(symbol)) {
                    this.followSets[currentSymbol].add(symbol);
                    changed = true;
                  }
                  allCanBeEmpty = false;
                  break;
                } else {
                  const firstSet = this.firstSets[symbol];
                  for (let terminal of firstSet) {
                    if (
                      terminal !== "ε" &&
                      !this.followSets[currentSymbol].has(terminal)
                    ) {
                      this.followSets[currentSymbol].add(terminal);
                      changed = true;
                    }
                  }
                  if (!firstSet.has("ε")) {
                    allCanBeEmpty = false;
                    break;
                  }
                }
              }
              if (allCanBeEmpty) {
                addFollowOfHead = true;
              }
            }

            if (addFollowOfHead) {
              for (let terminal of this.followSets[head]) {
                if (!this.followSets[currentSymbol].has(terminal)) {
                  this.followSets[currentSymbol].add(terminal);
                  changed = true;
                }
              }
            }
          }
        }
      }
    }
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
    let movedItems = [];
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

  private getAllTerminals(): Set<string> {
    const terminals = new Set<string>();
    for (let rule of this.grammar) {
      rule.body.forEach((symbol) => {
        if (this.isTerminal(symbol)) {
          terminals.add(symbol);
        }
      });
    }
    terminals.add("$");
    return terminals;
  }

  private computeStates(): void {
    // add state S' -> S
    this.grammar.unshift({
      head: this.grammar[0].head + "'",
      body: [this.grammar[0].head],
    });

    const startState = this.closure([
      `${this.grammar[0].head} -> . ${this.grammar[0].body.join(" ")}`,
    ]);
    this.states = [startState];
    let i = 0;

    while (i < this.states.length) {
      const symbols: Set<string> = new Set();
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

          if (this.isNonTerminal(symbol)) {
            this.gotoTable[`I${i},${symbol}`] = `I${existingIndex}`;
          } else {
            this.actionTable[`I${i},${symbol}`] = `S${existingIndex}`;
          }
        }
      }

      for (let item of this.states[i]) {
        if (item.endsWith(".")) {
          const [head, body] = item.slice(0, -1).split(" -> ");
          if (
            head === this.grammar[0].head &&
            body.trim() === this.grammar[0].body.join(" ")
          ) {
            this.actionTable[`I${i},$`] = "Accept";
          } else {
            const ruleIndex = this.grammar.findIndex(
              (rule) =>
                rule.head === head && rule.body.join(" ") === body.trim()
            );
            if (ruleIndex !== -1) {
              const followSet = this.followSets[head];
              for (let terminal of followSet) {
                this.actionTable[`I${i},${terminal}`] = `R${ruleIndex}`;
              }
            }
          }
        }
      }

      i++;
    }
  }

  private getActionTableJson(): object[] {
    const symbols = this.getAllTerminals();
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
