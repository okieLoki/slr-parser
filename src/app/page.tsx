"use client";

import { useState, useCallback } from "react";
import { SLRParser } from "../lib/slrParser";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Alert, AlertDescription } from "../components/ui/alert";
import { IGrammarRule, IParsedData } from "@/types/slrParserTypes";
import MermaidDiagram from "@/components/mermaidWrapper";
import { generateMermaidDiagram } from "@/lib/mermaidHelper";

const Home = () => {
  const [grammar, setGrammar] = useState<string>("");
  const [parsedData, setParsedData] = useState<IParsedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mermaidDiagram, setMermaidDiagram] = useState<string>("");

  const parseGrammarString = useCallback(
    (grammarString: string): IGrammarRule[] => {
      const rules: IGrammarRule[] = [];
      const ruleStrings = grammarString
        .split("\n")
        .filter((line) => line.trim());

      for (const ruleString of ruleStrings) {
        const parts = ruleString.split("->").map((part) => part.trim());
        if (parts.length !== 2) {
          throw new Error(`Invalid rule format: ${ruleString}`);
        }

        const head = parts[0];
        const bodies = parts[1].split("|").map((body) => body.trim());

        for (const body of bodies) {
          const symbols = body.split(/\s+/).filter(Boolean);
          rules.push({ head, body: symbols });
        }
      }

      return rules;
    },
    []
  );

  const handleGrammarChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGrammar(e.target.value);
    setError(null);
  };

  const parseGrammar = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setParsedData(null);

      const grammarRules = parseGrammarString(grammar);
      const parser = new SLRParser(grammarRules);
      const result = (await parser.parse()) as IParsedData;

      setParsedData(result);
      const diagram = generateMermaidDiagram(result.states, result.transitions);
      setMermaidDiagram(diagram);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderTable = (data: any[], tableType: "action" | "goto") => {
    if (!data || data.length === 0) return null;

    const headers = Object.keys(data[0]).filter((key) => key !== "state");

    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">
          {tableType === "action" ? "Action Table" : "Goto Table"}
        </h2>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="font-medium bg-muted">State</TableCell>
                {headers.map((header) => (
                  <TableCell key={header} className="font-medium bg-muted">
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.state}</TableCell>
                  {headers.map((header) => (
                    <TableCell key={header}>{row[header] || ""}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">SLR Parser - Grammar Input</h1>

      <div className="space-y-4">
        <textarea
          className="w-full min-h-[200px] p-4 border rounded-lg font-mono text-sm"
          value={grammar}
          onChange={handleGrammarChange}
          placeholder={`Enter grammar rules, one per line:
S -> A B
A -> a
B -> b`}
        />

        <Button
          onClick={parseGrammar}
          className="w-full sm:w-auto"
          disabled={isLoading}
        >
          {isLoading ? "Parsing..." : "Parse Grammar"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {parsedData && (
        <div className="space-y-8">
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">State Diagram</h2>
            <div className="border rounded-lg p-4 bg-white">
              <MermaidDiagram diagram={mermaidDiagram} />
            </div>
          </div>
          {renderTable(parsedData.actionTable, "action")}
          {renderTable(parsedData.gotoTable, "goto")}
        </div>
      )}
    </div>
  );
};

export default Home;
