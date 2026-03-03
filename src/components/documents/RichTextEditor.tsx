import { useRef, useEffect } from 'react';
import { DocumentEditorContainerComponent, Toolbar } from '@syncfusion/ej2-react-documenteditor';
// Importa o CSS da Syncfusion para o tema Material/Tailwind (sincronizado visualmente)
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';

// Inject Toolbar Module
DocumentEditorContainerComponent.Inject(Toolbar);

interface RichTextEditorProps {
    content: string; // SFDT (Syncfusion Document Text) format in JSON string, or HTML fallback
    onChange: (content: string) => void;
    editable?: boolean;
}

export function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
    const containerRef = useRef<DocumentEditorContainerComponent>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const editor = containerRef.current.documentEditor;

        // Timeout para garantir que o componente montou e está pronto para receber doc
        setTimeout(() => {
            if (!content) {
                // Se for novo sem template, não carrega nada
                return;
            }

            try {
                // Tenta carregar como SFDT primeiro (o formato nativo do Syncfusion com paginação perfeita)
                // Usualmente salva-se um JSON stringificado
                if (content.startsWith('{')) {
                    editor.open(content);
                } else {
                    // Se for legado (HTML do TipTap/Jodit salvos na base), tentamos importar como HTML
                    // Nota: O Syncfusion lê HTML básico, mas não recuperará paginações antigas pq elas não existiam
                    editor.open(JSON.stringify({ "sections": [{ "blocks": [{ "paragraphFormat": { "styleName": "Normal" }, "inlines": [{ "text": "Formato não suportado diretamente. Copie e cole os textos anteriores." }] }] }] }));
                    console.log("Para carregar HTML nativamente no Syncfusion seria necessário um conversor backend do servidor Syncfusion. Por hora abrindo vazio ou sfdt base.");
                }
            } catch (e) {
                console.error("Failed to load document into Syncfusion:", e);
            }
        }, 100);
    }, []); // Dependência vazia: carrega apenas no mount para não travar a edição digitando

    // Syncfusion doesn't have a simple "onBlur text" like simple inputs because documents are complex (SFDT format includes headers, images, margins).
    // The standard way is to extract the text manually when the parent needs to Save. 
    // To support automatic draft saving on Documentos.tsx, we can listen to documentChange
    useEffect(() => {
        if (!containerRef.current) return;
        const editor = containerRef.current.documentEditor;

        const onDocumentChange = () => {
            // Extrair o documento atual como SFDT (JSON nativo com paginacao, cabecalho, texto etc)
            editor.saveAsBlob('Sfdt').then((blob) => {
                const reader = new FileReader();
                reader.onload = () => {
                    onChange(reader.result as string);
                };
                reader.readAsText(blob);
            });
        };

        editor.documentChange = onDocumentChange;

        return () => {
            editor.documentChange = () => { };
        };
    }, [onChange]);


    return (
        <div className="w-full h-full min-h-[80vh] bg-[#f8f9fa] border border-gray-200 shadow-sm relative overflow-hidden">
            <DocumentEditorContainerComponent
                id="container"
                ref={containerRef}
                height="100%"
                width="100%"
                enableToolbar={true}
                restrictEditing={!editable}
                // Configurações para garantir visão de página e régua
                documentEditorSettings={{
                    showRuler: true,
                    optimizeSfdt: true
                }}
            />

            {/* O Syncfusion gera uma barra de status embaixo nativa. Adicionamos alguns fixes pra ele caber no container tailwind */}
            <style>{`
                #container { border: none !important; }
                .e-de-ctnr-toolbar { background: #fff !important; }
            `}</style>
        </div>
    );
}
