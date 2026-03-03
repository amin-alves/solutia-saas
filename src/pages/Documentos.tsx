import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { generateXlsx } from "@/services/documents/xlsxGenerator"
import { generatePdf } from "@/services/documents/pdfGenerator"
import { ChevronDown, FileText, FileSpreadsheet, FileIcon, Upload, Edit3 } from "lucide-react"

import { TemplateManager } from "@/components/documents/TemplateManager"
import { DocumentEditor } from "@/components/documents/DocumentEditor"
import { LocalSyncManager } from "@/components/documents/LocalSyncManager"

interface Documento {
    id: string;
    titulo: string;
    pasta: string;
    tamanho: string;
    data: string;
    empresa_id: string;
    status?: 'rascunho' | 'finalizado';
    versao_atual?: number;
    created_at?: string;
}

export default function DocumentosPage() {
    const [activeTab, setActiveTab] = useState<'documentos' | 'modelos'>('documentos')
    const [busca, setBusca] = useState("")
    const [documentos, setDocumentos] = useState<Documento[]>([])
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const empresaId = localStorage.getItem("solutia_empresa_id") || ''

    // New Editor States
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [editorTemplate, setEditorTemplate] = useState<any>(null)
    const [editingDocId, setEditingDocId] = useState<string | null>(null)

    // Fechar menu ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    const openEditor = () => {
        setEditorTemplate(null)
        setEditingDocId(null)
        setIsEditorOpen(true)
        setIsMenuOpen(false)
    }

    const openEditorWithTemplate = (template: any) => {
        setEditorTemplate(template)
        setEditingDocId(null)
        setIsEditorOpen(true)
    }


    // Removed old handleSaveDocument handler as it's now internal to DocumentEditor

    const testGenerateXlsx = async () => {
        try {
            const data = [
                { nome: "João Silva", cargo: "Desenvolvedor", departamento: "TI" },
                { nome: "Maria Souza", cargo: "Designer", departamento: "Marketing" },
                { nome: "Pedro Gomes", cargo: "Gerente", departamento: "Vendas" }
            ]
            const blob = await generateXlsx("Relatório de Funcionários", data)
            downloadBlob(blob, "relatorio-funcionarios.xlsx")
        } catch (e) {
            console.error(e)
            alert("Erro ao gerar XLSX")
        } finally {
            setIsMenuOpen(false)
        }
    }

    const testGeneratePdf = async () => {
        try {
            const data = [
                { id: 1, produto: "Notebook", valor: "R$ 4500,00" },
                { id: 2, produto: "Monitor", valor: "R$ 1200,00" },
                { id: 3, produto: "Teclado", valor: "R$ 350,00" }
            ]
            const blob = await generatePdf("Relatório de Vendas", "Este é um relatório gerado automaticamente pelo sistema contendo as vendas recentes e outras informações úteis.", data)
            downloadBlob(blob, "relatorio-vendas.pdf")
        } catch (e) {
            console.error(e)
            alert("Erro ao gerar PDF")
        } finally {
            setIsMenuOpen(false)
        }
    }

    // Ao montar a página, carrega apenas os documentos da empresa logada
    useEffect(() => {
        async function fetchDocumentos() {
            const empresaId = localStorage.getItem("solutia_empresa_id")

            if (!empresaId) {
                setDocumentos([])
                return
            }

            // Carrega os documentos reais do banco mapeados à mesma empresa
            const { data, error } = await supabase
                .from("documentos")
                .select("*")
                .eq("empresa_id", empresaId)

            if (!error && data) {
                setDocumentos(data as Documento[])
            } else {
                console.error("Erro ao carregar documentos:", error)
            }
        }

        fetchDocumentos()
    }, [])

    const documentosFiltrados = documentos.filter((doc) =>
        doc.titulo?.toLowerCase().includes(busca.toLowerCase()) || doc.pasta?.toLowerCase().includes(busca.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight dark:text-white">Gerenciador de Documentos</h1>
                    <p className="text-gray-500 mt-1 dark:text-gray-400">Crie, gerencie e versione os arquivos e contratos da sua organização.</p>
                </div>
                {activeTab === 'documentos' && (
                    <div className="flex gap-3 mt-4 md:mt-0 items-center">
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-100 transition-all shadow-sm"
                            >
                                Novo Documento
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50">
                                    <button
                                        onClick={openEditor}
                                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-gray-700 text-sm font-medium text-indigo-700 dark:text-indigo-400 flex items-center gap-3 transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        Escrever Documento em Branco
                                    </button>
                                    <hr className="my-1 border-gray-100 dark:border-gray-700" />
                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setActiveTab('modelos');
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center gap-3 transition-colors"
                                    >
                                        <FileIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        Criar a partir de Modelo
                                    </button>
                                    <hr className="my-1 border-gray-100 dark:border-gray-700" />
                                    <button
                                        onClick={testGeneratePdf}
                                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center gap-3 transition-colors"
                                    >
                                        <FileText className="w-4 h-4 text-red-500" />
                                        Gerar Relatório Antigo (PDF)
                                    </button>
                                    <button
                                        onClick={testGenerateXlsx}
                                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center gap-3 transition-colors"
                                    >
                                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                        Gerar Planilha Antiga (XLSX)
                                    </button>
                                </div>
                            )}
                        </div>

                        <button className="bg-indigo-600 shadow-lg shadow-indigo-600/30 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Enviar Arquivo
                        </button>
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                <button
                    onClick={() => setActiveTab('documentos')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'documentos'
                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    <FileText size={18} /> Meus Documentos
                </button>
                <button
                    onClick={() => setActiveTab('modelos')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'modelos'
                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    <FileIcon size={18} /> Modelos (Templates)
                </button>
            </div>

            {activeTab === 'modelos' ? (
                <div className="animate-in fade-in duration-300">
                    <TemplateManager
                        empresaId={empresaId}
                        onSelectTemplate={openEditorWithTemplate}
                    />
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <LocalSyncManager empresaId={empresaId} />

                    <div className="relative max-w-md">
                        <input
                            type="text"
                            placeholder="Buscar por título ou pasta..."
                            className="w-full pl-4 pr-10 py-3 border border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl shadow-sm outline-none transition-all"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/50 border-b border-gray-100 dark:border-gray-700 dark:bg-gray-800/50">
                                    <tr>
                                        <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Documento</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Pasta / Categoria</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Tamanho</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-right">Data</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {documentosFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                                Nenhum documento encontrado.
                                            </td>
                                        </tr>
                                    ) : null}

                                    {documentosFiltrados.map((doc) => (
                                        <tr
                                            key={doc.id}
                                            className="hover:bg-indigo-50/30 dark:hover:bg-gray-800 transition-colors group"
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                                        {doc.status === 'rascunho' ? <Edit3 size={18} /> : <FileText size={18} />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{doc.titulo}</span>
                                                        {doc.status === 'finalizado' && (
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">Versão {doc.versao_atual || 1}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600 dark:text-gray-300">{doc.pasta}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${doc.status === 'rascunho'
                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    }`}>
                                                    {doc.status === 'rascunho' ? 'Rascunho' : 'Finalizado'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">{doc.tamanho}</td>
                                            <td className="p-4 text-gray-500 dark:text-gray-400 text-sm font-medium text-right">
                                                {new Date(doc.data || doc.created_at || Date.now()).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {doc.status === 'rascunho' ? (
                                                        <button
                                                            onClick={() => {
                                                                setEditingDocId(doc.id)
                                                                setIsEditorOpen(true)
                                                            }}
                                                            className="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
                                                            title="Continuar Editando"
                                                        >
                                                            <Edit3 size={18} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={async () => {
                                                                // Como não salvamos o 'tipo' exato aqui na tabela no passado (só rascunho/final), 
                                                                // por enquanto forçamos .sfdt (Textos) em vez de .html
                                                                const path = `final/${empresaId}/${doc.id}_v${doc.versao_atual || 1}.sfdt`
                                                                try {
                                                                    const { data, error } = await supabase.storage.from('documentos-saas').createSignedUrl(path, 60)
                                                                    if (error) throw error
                                                                    window.open(data.signedUrl, '_blank')
                                                                } catch (e) {
                                                                    alert('Erro ao gerar link de download. Verifique se o arquivo existe no Storage.')
                                                                }
                                                            }}
                                                            className="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 hover:bg-white"
                                                            title="Baixar Documento"
                                                        >
                                                            Baixar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}


            {isEditorOpen && (
                <DocumentEditor
                    empresaId={empresaId}
                    initialTemplate={editorTemplate}
                    documentoId={editingDocId}
                    onClose={() => {
                        setIsEditorOpen(false)
                        setEditorTemplate(null)
                        setEditingDocId(null)
                    }}
                    onSaved={() => {
                        // Recarregar os arquivos da lista quando um é salvo
                        const fetchDocs = async () => {
                            if (!empresaId) return;
                            const { data } = await supabase.from("documentos").select("*").eq("empresa_id", empresaId);
                            if (data) setDocumentos(data as Documento[]);
                        }
                        fetchDocs()
                    }}
                />
            )}
        </div>
    )
}
