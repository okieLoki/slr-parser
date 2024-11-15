import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidConfig {
    startOnLoad: boolean;
    theme: 'default' | 'forest' | 'dark' | 'neutral' | 'base';
    securityLevel: 'strict' | 'loose' | 'antiscript';
    stateDiagram: {
        useMaxWidth: boolean;
        htmlLabels: boolean;
        curve: 'basis' | 'linear' | 'cardinal';
    };
}

interface MermaidDiagramProps {
    diagram: string;
    className?: string;
}

interface MermaidRenderResult {
    svg: string;
    bindFunctions?: (element: Element) => void;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ diagram, className = '' }) => {
    const diagramRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (diagramRef.current && diagram) {
            const config: MermaidConfig = {
                startOnLoad: true,
                theme: 'neutral',
                securityLevel: 'loose',
                stateDiagram: {
                    useMaxWidth: true,
                    htmlLabels: true,
                    curve: 'basis'
                }
            };

            mermaid.initialize(config);

            const renderDiagram = async (): Promise<void> => {
                try {
                    if (!diagramRef.current) return;
                    diagramRef.current.innerHTML = '';
                    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

                    const { svg } = await mermaid.render(id, diagram) as MermaidRenderResult;

                    if (diagramRef.current) {
                        diagramRef.current.innerHTML = svg;
                    }
                } catch (error) {
                    console.error('Failed to render diagram:', error);

                    if (diagramRef.current) {
                        diagramRef.current.innerHTML = `
              <div class="text-red-500">
                Failed to render diagram: ${error instanceof Error ? error.message : 'Unknown error'}
              </div>
            `;
                    }
                }
            };

            void renderDiagram();
        }
    }, [diagram]);

    return (
        <div
            ref={diagramRef}
            className={`w-full overflow-x-auto ${className}`.trim()}
            data-testid="mermaid-diagram"
        />
    );
};

MermaidDiagram.displayName = 'MermaidDiagram';

export default MermaidDiagram;