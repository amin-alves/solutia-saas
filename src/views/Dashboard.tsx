import { useState, useRef, useCallback, useEffect } from "react"
import BiMetrics from "../components/dashboard/BiMetrics"
import TramitacaoPanel from "../components/dashboard/TramitacaoPanel"
import { X, Upload, FileText, Info, ChevronRight as ChevronRightIcon, FolderInput, Columns, LayoutGrid } from "lucide-react"
import { supabase } from '@/lib/supabase'
import { DocumentTree } from '@/components/documents/DocumentTree'
import { FileUploader } from '@/components/documents/FileUploader'
import { DocumentView } from '@/components/documents/DocumentView'
import { SignatureModal } from '@/components/documents/SignatureModal'
import { useUserPreferences } from '@/contexts/UserPreferencesContext'

interface Documento {
    id: string
    titulo: string
    pasta_id: string | null
    extensao: string | null
    mime_type: string | null
    tamanho: string
    status: string
    versao_atual: number | null
    caminho_storage: string | null
    created_at: string
    assinado?: boolean
}

interface Pasta {
    id: string
    nome: string
    pasta_pai_id: string | null
    empresa_id: string
}

const GENERAL_FOLDER_NAME = 'Geral'

const normalizeText = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const isProtectedDocument = (doc: Documento) => normalizeText(doc.titulo).startsWith('termo de uso')

export default function Dashboard() {
    const { preferences, setDashboardPreferences } = useUserPreferences()
    // --- Layout State ---
    const leftWidth = preferences.dashboard.leftPanelWidth

    // Toggles para as 3 linhas verticais
    const showDocs = preferences.dashboard.showDocs
    const showWorkflow = preferences.dashboard.showWorkflow
    const showAnalytics = preferences.dashboard.showAnalytics

    // --- Analytics: registra acesso à página ---
    useEffect(() => {
        // trackEvent('view_dashboard') // Remove if not imported
    }, [])

    const containerRef = useRef<HTMLDivElement>(null)
    const draggingRef = useRef<'left' | 'right' | 'center' | null>(null)

    // --- Documentos State ---
    const empresaId = typeof window !== 'undefined' ? (localStorage.getItem('solutia_empresa_id') || '') : ''
    const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null)
    const [selectedFolder, setSelectedFolder] = useState<Pasta | null>(null)
    const [showUploader, setShowUploader] = useState(false)
    const [showSignModal, setShowSignModal] = useState(false)
    const [showMoveModal, setShowMoveModal] = useState(false)
    const [docForAction, setDocForAction] = useState<Documento | null>(null)
    const [pastas, setPastas] = useState<{ id: string; nome: string; pasta_pai_id: string | null }[]>([])
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const generalFolder = pastas.find((p) => normalizeText(p.nome) === normalizeText(GENERAL_FOLDER_NAME))

    // --- Handlers para Resizing ---
    const handleMouseDown = useCallback((divider: 'left' | 'right' | 'center') => {
        draggingRef.current = divider
        document.body.style.cursor = divider === 'center' ? 'row-resize' : 'col-resize'
        document.body.style.userSelect = 'none'

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current || !draggingRef.current) return
            const rect = containerRef.current.getBoundingClientRect()

            if (draggingRef.current === 'left') {
                const pct = ((e.clientX - rect.left) / rect.width) * 100
                setDashboardPreferences(prev => ({ ...prev, leftPanelWidth: Math.min(Math.max(pct, 12), 45) }))
            }
        }

        const handleMouseUp = () => {
            draggingRef.current = null
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }, [])

    const centerWidth = 100 - leftWidth

    // Em vez de um useEffect genérico, os URLs de preview serão carregados no componente individual do documento.

    const refresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1)
    }, [])

    useEffect(() => {
        if (!empresaId) return
        supabase.from('pastas').select('id, nome, pasta_pai_id').eq('empresa_id', empresaId)
            .then(({ data }) => { if (data) setPastas(data) })
    }, [empresaId, refreshTrigger])

    const handleMove = async (targetPastaId: string | null, targetPastaNome: string) => {
        if (!docForAction) return
        const { error } = await supabase
            .from('documentos')
            .update({ pasta_id: targetPastaId, pasta: targetPastaNome })
            .eq('id', docForAction.id)

        if (!error) {
            if (selectedDoc?.id === docForAction.id) {
                setSelectedDoc({ ...docForAction, pasta_id: targetPastaId })
            }
            setShowMoveModal(false)
            setDocForAction(null)
            refresh()
        } else {
            alert('Erro ao mover: ' + error.message)
        }
    }

    const handleDownload = async (doc: Documento) => {
        if (!doc?.caminho_storage) return
        try {
            const { data, error } = await supabase.storage
                .from('documentos_corporativos')
                .download(doc.caminho_storage)
            if (error) throw error
            const url = URL.createObjectURL(data)
            const a = document.createElement('a')
            a.href = url
            a.download = `${doc.titulo}.${doc.extensao || 'bin'}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            // trackEvent('download_documento', { extensao: doc.extensao || 'desconhecido' })
        } catch (e) {
            console.error('Erro no download:', e)
            alert('Erro ao baixar arquivo.')
        }
    }

    const handleDelete = async (doc: Documento) => {
        if (!doc) return
        if (doc.assinado) {
            alert('🔒 Documento assinado não pode ser excluído.')
            return
        }
        if (isProtectedDocument(doc)) {
            alert('🔒 O arquivo "Termo de Uso" é obrigatório e não pode ser excluído.')
            return
        }
        if (!confirm(`Excluir "${doc.titulo}" permanentemente?`)) return
        try {
            const userId = (await supabase.auth.getUser()).data.user?.id || null
            const { error } = await supabase
                .from('documentos')
                .update({ deleted_at: new Date().toISOString(), deletado_por: userId })
                .eq('id', doc.id)
            if (error) throw error

            if (selectedDoc?.id === doc.id) {
                setSelectedDoc(null)
            }

            refresh()
        } catch (e) {
            console.error('Erro ao excluir:', e)
            alert('Erro ao excluir documento.')
        }
    }

    const handleRenameDoc = async (doc: Documento) => {
        if (!doc) return
        const novoTitulo = prompt('Novo título:', doc.titulo)
        if (!novoTitulo?.trim() || novoTitulo === doc.titulo) return
        const { error } = await supabase
            .from('documentos')
            .update({ titulo: novoTitulo.trim() })
            .eq('id', doc.id)
        if (!error) {
            if (selectedDoc?.id === doc.id) {
                setSelectedDoc({ ...doc, titulo: novoTitulo.trim() })
            }
            refresh()
        }
    }

    return (
        <div ref={containerRef} className="h-[calc(100vh-4.5rem)] flex relative gap-0.5">

            {/* ═══ Painel Esquerdo: Árvore de Arquivos ═══ */}
            <div className="h-full overflow-hidden flex flex-col bg-white dark:bg-gray-800" style={{ width: `${leftWidth}%` }}>
                <div className="flex-1 overflow-auto rounded-md border border-gray-100 dark:border-gray-700 m-0.5 mr-0">
                    <DocumentTree
                        empresaId={empresaId}
                        viewKey="dashboard"
                        onSelectDocument={(doc) => {
                            setSelectedDoc(doc)
                            setSelectedFolder(null)
                        }}
                        onSelectFolder={(pasta) => {
                            setSelectedFolder(pasta)
                            setSelectedDoc(null)
                        }}
                        selectedDocId={selectedDoc?.id}
                        selectedFolderId={selectedFolder?.id}
                        refreshTrigger={refreshTrigger}
                    />
                </div>
            </div>

            {/* Divider Esquerdo */}
            <div
                className="w-1 h-full cursor-col-resize group flex items-center justify-center shrink-0 transition-colors"
                onMouseDown={() => handleMouseDown('left')}
            >
                <div className="w-px h-8 bg-gray-300 rounded-full transition-colors group-hover:bg-[var(--primary-color)]" />
            </div>

            {/* ═══ Painel Central (Dividido em Linhas Verticais) ═══ */}
            <div className="h-full flex flex-col mx-0.5 gap-0.5" style={{ width: `${centerWidth}%` }}>

                {/* Header de Controle dos Painéis */}
                <div className="flex items-center justify-between px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shrink-0">
                    <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                        Visualização
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setDashboardPreferences(prev => ({ ...prev, showDocs: !prev.showDocs }))} className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all ${showDocs ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'}`} style={showDocs ? { backgroundColor: 'var(--primary-color-light)', color: 'var(--primary-color)' } : {}}><FileText size={13} /> Documentos</button>
                        <button onClick={() => setDashboardPreferences(prev => ({ ...prev, showWorkflow: !prev.showWorkflow }))} className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all ${showWorkflow ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'}`} style={showWorkflow ? { backgroundColor: 'var(--primary-color-light)', color: 'var(--primary-color)' } : {}}><LayoutGrid size={13} /> Tramitação</button>
                        <button onClick={() => setDashboardPreferences(prev => ({ ...prev, showAnalytics: !prev.showAnalytics }))} className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all ${showAnalytics ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'}`} style={showAnalytics ? { backgroundColor: 'var(--primary-color-light)', color: 'var(--primary-color)' } : {}}><Columns size={13} /> Analytics</button>
                    </div>
                </div>

                {/* Container Principal dos Painéis */}
                <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">

                    {/* Linha 1: Documentos */}
                    {showDocs && (
                        <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-lg overflow-hidden flex flex-col min-h-[150px]">
                            <div className="flex-1 overflow-x-auto p-1.5 flex gap-1.5 min-w-0">
                                <div className="flex-1 flex flex-col overflow-y-auto min-w-[320px] transition-all rounded-lg border border-transparent">
                                    {selectedDoc ? (
                                        <DocumentView
                                            doc={selectedDoc}
                                            empresaId={empresaId}
                                            onRename={handleRenameDoc}
                                            onDownload={handleDownload}
                                            onDelete={handleDelete}
                                            onShowSignModal={(d) => { setDocForAction(d); setShowSignModal(true) }}
                                            onShowMoveModal={(d) => { setDocForAction(d); setShowMoveModal(true) }}
                                            onClose={() => setSelectedDoc(null)}
                                            refreshTrigger={refreshTrigger}
                                            refresh={refresh}
                                        />
                                    ) : selectedFolder ? (
                                        <div className="max-w-2xl mx-auto space-y-4 w-full pt-2">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                                <span>Pastas</span> <ChevronRightIcon size={14} /> <span className="font-medium text-gray-700 dark:text-gray-200">{selectedFolder.nome}</span>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5" style={{ color: 'var(--primary-color)' }}><Upload size={15} /> Enviar para "{selectedFolder.nome}"</h3>
                                                <FileUploader empresaId={empresaId} pastaId={selectedFolder.id} onUploadComplete={refresh} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: 'var(--primary-color-light)' }}><Info size={20} style={{ color: 'var(--primary-color)' }} /></div>
                                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Painel de Documentos Vazio</h2>
                                            <p className="text-[11px] text-gray-400 max-w-[200px] mb-3">Selecione um arquivo ou pasta na árvore à esquerda.</p>
                                            <button onClick={() => setShowUploader(true)} className="flex items-center gap-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-2.5 py-1 rounded-md text-xs font-medium hover:bg-gray-50 transition-all"><Upload size={14} /> Enviar Arquivo</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Linha 2: Workflow (Tramitação) */}
                    {showWorkflow && (
                        <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-lg overflow-hidden flex flex-col min-h-[200px]">
                            <TramitacaoPanel />
                        </div>
                    )}

                    {/* Linha 3: Analytics */}
                    {showAnalytics && (
                        <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-lg overflow-hidden flex flex-col min-h-[200px]">
                            <BiMetrics />
                        </div>
                    )}
                </div>
            </div>

            {/* === Modais === */}
            {showUploader && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Enviar Arquivo</h2>
                            <button onClick={() => setShowUploader(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={20} /></button>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-gray-500 mb-4">{selectedFolder ? `Enviando para: ${selectedFolder.nome}` : `O arquivo será enviado para: ${GENERAL_FOLDER_NAME}.`}</p>
                            <FileUploader empresaId={empresaId} pastaId={selectedFolder?.id || generalFolder?.id || null} onUploadComplete={() => { refresh(); setShowUploader(false) }} />
                        </div>
                    </div>
                </div>
            )}

            {showSignModal && docForAction && (
                <SignatureModal documentoId={docForAction.id} titulo={docForAction.titulo} extensao={docForAction.extensao} empresaId={empresaId} caminhoStorage={docForAction.caminho_storage} onClose={() => setShowSignModal(false)} onSigned={() => { refresh(); setShowSignModal(false) }} />
            )}

            {showMoveModal && docForAction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FolderInput size={20} /> Mover "{docForAction.titulo}"</h2>
                            <button onClick={() => setShowMoveModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={20} /></button>
                        </div>
                        <div className="p-3 max-h-[400px] overflow-y-auto space-y-1">
                            {generalFolder && (
                                <button onClick={() => handleMove(generalFolder.id, GENERAL_FOLDER_NAME)} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${docForAction.pasta_id === generalFolder.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}`}><FileText size={16} className="text-gray-400" /> {GENERAL_FOLDER_NAME}</button>
                            )}
                            {pastas.filter((p) => p.id !== generalFolder?.id).map(p => (
                                <button key={p.id} onClick={() => handleMove(p.id, p.nome)} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${docForAction.pasta_id === p.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}`} style={{ paddingLeft: p.pasta_pai_id ? '2.25rem' : '0.75rem' }}><FolderInput size={16} className="text-indigo-400" /> {p.nome} {docForAction.pasta_id === p.id && <span className="text-xs text-indigo-500 ml-auto">atual</span>}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
