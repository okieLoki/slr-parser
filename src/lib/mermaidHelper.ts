import { IParsedData } from "@/types/slrParserTypes";

const generateMermaidDiagram = (
  states: string[][],
  transitions: IParsedData["transitions"]
) => {
  let diagram = "stateDiagram-v2\n\n";

  states.forEach((state, index) => {
    const stateContent = state.join("\n\n");
    diagram += `  state "State ${index}\n\n${stateContent}" as S${index}\n`;
  });

  transitions.forEach((transition) => {
    if (["+", "-", "*", "/"].includes(transition.symbol)) {
      transition.symbol = `\\${transition.symbol}`;
    }
    diagram += `  S${transition.from} --> S${transition.to}: ${transition.symbol}\n`;
  });

  return diagram;
};

export { generateMermaidDiagram };
