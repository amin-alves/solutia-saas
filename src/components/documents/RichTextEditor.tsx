import { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    editable?: boolean;
}

export function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
    const editorRef = useRef<any>(null);

    return (
        <div className={`w-full h-full min-h-[80vh] bg-gray-100 border border-gray-200 shadow-sm rounded-md overflow-hidden ${!editable ? 'opacity-90' : ''} flex flex-col`}>
            {/* Usamos TinyMCE sem API Key via CDN livre. Ele será formatado como uma página A4 do Word. */}
            <div className="flex-1 overflow-y-auto">
                <Editor
                    tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/7.3.0/tinymce.min.js"
                    onInit={(_evt: any, editor: any) => editorRef.current = editor}
                    value={content || ''}
                    onEditorChange={(newContent: string) => {
                        onChange(newContent);
                    }}
                    disabled={!editable}
                    init={{
                        height: '100%',
                        menubar: 'file edit view insert format tools table help',
                        statusbar: true,
                        branding: false,
                        promotion: false,
                        language: 'pt_BR',
                        plugins: [
                            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount', 'pagebreak'
                        ],
                        toolbar: 'undo redo | blocks fontfamily fontsize | ' +
                            'bold italic underline strikethrough forecolor backcolor | alignleft aligncenter ' +
                            'alignright alignjustify | bullist numlist outdent indent | ' +
                            'table pagebreak | removeformat | help',
                        font_size_formats: '8pt 10pt 11pt 12pt 14pt 18pt 24pt 36pt',
                        font_family_formats: 'Arial=arial,helvetica,sans-serif; Calibri=calibri,sans-serif; Times New Roman=times new roman,times; Courier New=courier new,courier;',
                        // O segredo do modo "Word / A4" está aqui no content_style
                        content_style: `
                            body { 
                                font-family: 'Calibri', 'Arial', sans-serif; 
                                font-size: 11pt; 
                                line-height: 1.5;
                                
                                /* Simulando a folha A4 real (210mm x 297mm) */
                                width: 210mm;
                                min-height: 297mm;
                                
                                /* Margens de uma folha Word/A4 */
                                padding: 25.4mm !important; 
                                margin: 2rem auto !important; 
                                
                                background-color: #ffffff;
                                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
                                border: 1px solid #ddd;
                                box-sizing: border-box;
                            }
                            
                            /* Fundo falso para cobrir todo o iframe simulando a tela cinza do Word */
                            html {
                                background-color: #f3f4f6; 
                                min-height: 100%;
                                display: flex;
                                justify-content: center;
                                padding: 20px 0;
                            }

                            /* Estilizando o plugin 'pagebreak' para parecer o fim de uma folha de papel */
                            .mce-pagebreak {
                                border: 0;
                                border-bottom: 2px dashed #ccc;
                                margin: 20px 0;
                                page-break-before: always;
                                cursor: default;
                                display: block;
                                width: 100%;
                            }

                            table { border-collapse: collapse; width: 100%; }
                            table td, table th { border: 1px solid #ccc; padding: 4px; }
                        `,
                        // Para impressão perfeita separando nos pagebreaks
                        setup: function (editor: any) {
                            editor.on('PreInit', function () {
                                // Pequeno ajuste de inicialização
                            });
                        }
                    }}
                />
            </div>
            {/* Aviso no rodapé para instruir o usuário de como quebrar a página igual no Word */}
            <div className="bg-white border-t p-2 text-xs text-gray-500 text-center flex justify-between px-4">
                <span>Modo de Edição Livre (Estilo Word)</span>
                <span>Dica: Use <b>Inserir &gt; Quebra de página</b> para dividir o documento na impressão.</span>
            </div>
        </div>
    );
}
