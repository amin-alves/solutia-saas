import { useState, useRef, useCallback, useEffect } from "react"
import BiMetrics from "../components/dashboard/BiMetrics"
import WorkflowBoard from "../components/dashboard/WorkflowBoard"
import TramitacaoPanel from "../components/dashboard/TramitacaoPanel"
import { PanelRight, X, ChevronUp, ChevronDown, Download, Trash2, Pen, Upload, Eye, FileText, Info, ChevronRight as ChevronRightIcon, Loader2, FolderInput } from "lucide-react"
import { supabase } from '@/lib/supabase'
import { trackEvent } from '@/lib/analytics'

import { DocumentTree } from '@/components/documents/DocumentTree'
import { FileUploader } from '@/components/documents/FileUploader'
import { VersionHistory } from '@/components/documents/VersionHistory'
import { SignatureModal } from '@/components/documents/SignatureModal'
import { SignatureVerifier } from '@/components/documents/SignatureVerifier'

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

export default function Dashboard() {
    // --- Layout State ---
    const [leftWidth, setLeftWidth] = useState(25)
    const [showPanel, setShowPanel] = useState(false)
    const [panelWidth, setPanelWidth] = useState(28)
    const [centerTopHeight, setCenterTopHeight] = useState(50)
    const [showBiMetrics, setShowBiMetrics] = useState(false)
    const [showProcessosBiMetrics, setShowProcessosBiMetrics] = useState(false)

    // --- Analytics: registra acesso à página ---
    useEffect(() => { trackEvent('view_dashboard') }, [])

    const containerRef = useRef<HTMLDivElement>(null)
    const draggingRef = useRef<'left' | 'right' | 'center' | null>(null)

    // --- Documentos State ---
    const empresaId = localStorage.getItem('solutia_empresa_id') || ''
    const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null)
    const [selectedFolder, setSelectedFolder] = useState<Pasta | null>(null)
    const [showUploader, setShowUploader] = useState(false)
    const [showSignModal, setShowSignModal] = useState(false)
    const [showMoveModal, setShowMoveModal] = useState(false)
    const [pastas, setPastas] = useState<{ id: string; nome: string; pasta_pai_id: string | null }[]>([])
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loadingPreview, setLoadingPreview] = useState(false)

    const PREVIEWABLE = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'docx', 'doc', 'xlsx', 'xls', 'pptx']
    const OFFICE_TYPES = ['docx', 'doc', 'xlsx', 'xls', 'pptx']
    const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp']
    const isPreviewable = selectedDoc?.extensao ? PREVIEWABLE.includes(selectedDoc.extensao.toLowerCase()) : false
    const isOffice = selectedDoc?.extensao ? OFFICE_TYPES.includes(selectedDoc.extensao.toLowerCase()) : false
    const isImage = selectedDoc?.extensao ? IMAGE_TYPES.includes(selectedDoc.extensao.toLowerCase()) : false

    // --- Handlers para Resizing ---
    const handleMouseDown = useCallback((divider: 'left' | 'right' | 'center') => {
        draggingRef.current = divider
        document.body.style.cursor = divider === 'center' ? 'row-resize' : 'col-resize'
        document.body.style.userSelect = 'none'

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current || !draggingRef.current) return
            const rect = containerRef.current.getBoundingClientRect()

            if (draggingRef.current === 'center') {
                const pct = ((e.clientY - rect.top) / rect.height) * 100
                setCenterTopHeight(Math.min(Math.max(pct, 20), 80))
            } else {
                const pct = ((e.clientX - rect.left) / rect.width) * 100
                if (draggingRef.current === 'left') {
                    setLeftWidth(Math.min(Math.max(pct, 12), 45))
                } else {
                    setPanelWidth(Math.min(Math.max(100 - pct, 15), 50))
                }
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

    const centerWidth = showPanel ? 100 - leftWidth - panelWidth : 100 - leftWidth

    // --- Documentos Effects & Handlers ---
    useEffect(() => {
        if (!selectedDoc?.caminho_storage || !isPreviewable) {
            setPreviewUrl(null)
            return
        }
        let cancelled = false
        setLoadingPreview(true)
        supabase.storage
            .from('documentos_corporativos')
            .createSignedUrl(selectedDoc.caminho_storage, 600)
            .then(({ data, error }) => {
                if (!cancelled && !error && data) setPreviewUrl(data.signedUrl)
                else setPreviewUrl(null)
            })
            .finally(() => { if (!cancelled) setLoadingPreview(false) })
        return () => { cancelled = true }
    }, [selectedDoc?.id])

    const refresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1)
    }, [])

    useEffect(() => {
        if (!empresaId) return
        supabase.from('pastas').select('id, nome, pasta_pai_id').eq('empresa_id', empresaId)
            .then(({ data }) => { if (data) setPastas(data) })
    }, [empresaId, refreshTrigger])

    const handleMove = async (targetPastaId: string | null, targetPastaNome: string) => {
        if (!selectedDoc) return
        const { error } = await supabase
            .from('documentos')
            .update({ pasta_id: targetPastaId, pasta: targetPastaNome })
            .eq('id', selectedDoc.id)

        if (!error) {
            setSelectedDoc({ ...selectedDoc, pasta_id: targetPastaId })
            setShowMoveModal(false)
            refresh()
        } else {
            alert('Erro ao mover: ' + error.message)
        }
    }

    const handleDownload = async () => {
        if (!selectedDoc?.caminho_storage) return
        try {
            const { data, error } = await supabase.storage
                .from('documentos_corporativos')
                .download(selectedDoc.caminho_storage)
            if (error) throw error
            const url = URL.createObjectURL(data)
            const a = document.createElement('a')
            a.href = url
            a.download = `${selectedDoc.titulo}.${selectedDoc.extensao || 'bin'}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            trackEvent('download_documento', { extensao: selectedDoc.extensao || 'desconhecido' })
        } catch (e) {
            console.error('Erro no download:', e)
            alert('Erro ao baixar arquivo.')
        }
    }

    const handleDelete = async () => {
        if (!selectedDoc) return
        if (selectedDoc.assinado) {
            alert('🔒 Documento assinado não pode ser excluído.')
            return
        }
        if (!confirm(`Excluir "${selectedDoc.titulo}" permanentemente?`)) return
        try {
            const userId = (await supabase.auth.getUser()).data.user?.id || null
            const { error } = await supabase
                .from('documentos')
                .update({ deleted_at: new Date().toISOString(), deletado_por: userId })
                .eq('id', selectedDoc.id)
            if (error) throw error
            setSelectedDoc(null)
            refresh()
        } catch (e) {
            console.error('Erro ao excluir:', e)
            alert('Erro ao excluir documento.')
        }
    }

    const handleRenameDoc = async () => {
        if (!selectedDoc) return
        const novoTitulo = prompt('Novo título:', selectedDoc.titulo)
        if (!novoTitulo?.trim() || novoTitulo === selectedDoc.titulo) return
        const { error } = await supabase
            .from('documentos')
            .update({ titulo: novoTitulo.trim() })
            .eq('id', selectedDoc.id)
        if (!error) {
            setSelectedDoc({ ...selectedDoc, titulo: novoTitulo.trim() })
            refresh()
        }
    }

    return (
        <div ref={containerRef} className="h-[calc(100vh-7rem)] flex relative">

            {/* ═══ Painel Esquerdo: Árvore de Arquivos ═══ */}
            <div className="h-full overflow-hidden flex flex-col bg-white dark:bg-gray-800" style={{ width: `${leftWidth}%` }}>
                <div className="flex-1 overflow-auto rounded-xl border border-gray-100 dark:border-gray-700 m-2 mr-0">
                    <DocumentTree
                        empresaId={empresaId}
                        onSelectDocument={(doc) => { setSelectedDoc(doc); setSelectedFolder(null) }}
                        onSelectFolder={(pasta) => { setSelectedFolder(pasta); setSelectedDoc(null) }}
                        selectedDocId={selectedDoc?.id}
                        selectedFolderId={selectedFolder?.id}
                        refreshTrigger={refreshTrigger}
                    />
                </div>
            </div>

            {/* Divider Esquerdo */}
            <div
                className="w-1.5 h-full cursor-col-resize group flex items-center justify-center shrink-0 hover:bg-indigo-100 transition-colors"
                onMouseDown={() => handleMouseDown('left')}
            >
                <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-indigo-500 rounded-full transition-colors" />
            </div>

            {/* ═══ Painel Central (Dividido em Topo/Base) ═══ */}
            <div className="h-full flex flex-col mx-1" style={{ width: `${centerWidth}%` }}>

                {/* ═══ Painel Central Superior (Documentos) ═══ */}
                <div className="overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-lg relative" style={{ height: `${centerTopHeight}%` }}>

                    {/* Visualização de Documento / Pasta (Meio Acima) */}
                    <div className={`flex-1 overflow-y-auto p-4 md:p-6 ${showBiMetrics ? 'h-[55%]' : 'h-[calc(100%-3rem)]'}`}>
                        {selectedDoc ? (
                            <div className="max-w-4xl mx-auto space-y-6">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4 min-w-0">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                                                <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
                                            </div>
                                            <div className="min-w-0">
                                                <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 transition-colors" onClick={handleRenameDoc} title="Clique para renomear">
                                                    {selectedDoc.titulo}
                                                </h2>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                    <span className="uppercase font-medium text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">.{selectedDoc.extensao || '?'}</span>
                                                    <span>{selectedDoc.tamanho}</span>
                                                    <span>•</span><span>v{selectedDoc.versao_atual || 1}</span>
                                                    {selectedDoc.assinado && (<><span>•</span><span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">✓ Assinado</span></>)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"><Download size={16} /> Baixar</button>
                                        <button onClick={() => setShowSignModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50"><Pen size={16} /> Assinar</button>
                                        <button onClick={() => setShowMoveModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50"><FolderInput size={16} /> Mover</button>
                                        <button onClick={handleDelete} disabled={selectedDoc.assinado} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ml-auto ${selectedDoc.assinado ? 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-50' : 'text-red-600 bg-white border border-red-200 hover:bg-red-50'}`}>{selectedDoc.assinado ? '🔒' : <Trash2 size={16} />} Excluir</button>
                                    </div>
                                </div>

                                {isPreviewable && (
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Eye size={16} /> Visualização</h3></div>
                                        {loadingPreview ? (<div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>)
                                            : previewUrl ? (
                                                <div className="bg-gray-100 dark:bg-gray-900">
                                                    {isImage ? (<img src={previewUrl} alt={selectedDoc.titulo} className="w-full max-h-[400px] object-contain p-4" />)
                                                        : isOffice ? (<iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`} className="w-full h-[500px] border-0" title="Preview" />)
                                                            : (<iframe src={previewUrl} className="w-full h-[500px] border-0" title="Preview" />)}
                                                </div>
                                            ) : (<div className="text-center py-8 text-sm text-gray-400">Não foi possível carregar o preview.</div>)}
                                    </div>
                                )}

                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <VersionHistory documentoId={selectedDoc.id} empresaId={empresaId} titulo={selectedDoc.titulo} extensao={selectedDoc.extensao} isAssinado={selectedDoc.assinado} onNewVersion={refresh} />
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <SignatureVerifier documentoId={selectedDoc.id} caminhoStorage={selectedDoc.caminho_storage} />
                                </div>
                            </div>
                        ) : selectedFolder ? (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <span>Pastas</span> <ChevronRightIcon size={14} /> <span className="font-medium text-gray-700 dark:text-gray-200">{selectedFolder.nome}</span>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Upload size={20} className="text-indigo-500" /> Enviar para "{selectedFolder.nome}"</h3>
                                    <FileUploader empresaId={empresaId} pastaId={selectedFolder.id} onUploadComplete={refresh} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4"><Info size={32} className="text-indigo-400" /></div>
                                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Visão Geral Documentos</h2>
                                <p className="text-sm text-gray-400 max-w-md mb-6">Selecione uma pasta ou documento na árvore para visualizar os detalhes e gerenciar os arquivos da empresa.</p>
                                <button onClick={() => setShowUploader(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg"><Upload size={18} /> Enviar Arquivo na Raiz</button>
                            </div>
                        )}
                    </div>

                    {/* Área BI Toggle 1 (Abaixo no Meio) */}
                    <div className={`border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 flex flex-col ${showBiMetrics ? 'h-[45%]' : 'h-12'}`}>
                        <div
                            className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                            onClick={() => setShowBiMetrics(!showBiMetrics)}
                        >
                            <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                                Dashboard Analytics Documentos
                            </h3>
                            {showBiMetrics ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronUp size={20} className="text-gray-400" />}
                        </div>
                        {showBiMetrics && (
                            <div className="flex-1 overflow-auto bg-gray-50/50 dark:bg-gray-900/50">
                                <BiMetrics />
                            </div>
                        )}
                    </div>
                </div>

                {/* Divider Central Horizontal */}
                <div
                    className="h-1.5 w-full cursor-row-resize group flex items-center justify-center shrink-0 hover:bg-indigo-100 transition-colors z-10 my-0.5"
                    onMouseDown={() => handleMouseDown('center')}
                >
                    <div className="h-0.5 w-8 bg-gray-300 group-hover:bg-indigo-500 rounded-full transition-colors" />
                </div>

                {/* ═══ Painel Central Inferior (Processos) ═══ */}
                <div className="overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-lg relative" style={{ height: `calc(${100 - centerTopHeight}% - 0.375rem)` }}>

                    {/* Tramitações */}
                    <div className={`flex-1 overflow-hidden ${showProcessosBiMetrics ? 'h-[55%]' : 'h-[calc(100%-3rem)]'}`}>
                        <TramitacaoPanel />
                    </div>

                    {/* Área BI Toggle 2 (Abaixo no Meio) */}
                    <div className={`border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 flex flex-col ${showProcessosBiMetrics ? 'h-[45%]' : 'h-12'}`}>
                        <div
                            className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                            onClick={() => setShowProcessosBiMetrics(!showProcessosBiMetrics)}
                        >
                            <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                                Dashboard Analytics Processos
                            </h3>
                            {showProcessosBiMetrics ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronUp size={20} className="text-gray-400" />}
                        </div>
                        {showProcessosBiMetrics && (
                            <div className="flex-1 overflow-auto bg-gray-50/50 dark:bg-gray-900/50 p-6 flex flex-col items-center justify-center">
                                <h2 className="text-xl font-bold text-gray-600 dark:text-gray-300">BiMetrics Processos Em Breve</h2>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ Painel Direito Togglável: Workflow ═══ */}
            {showPanel && (
                <>
                    <div className="w-1.5 h-full cursor-col-resize group flex items-center justify-center shrink-0 hover:bg-indigo-100 transition-colors" onMouseDown={() => handleMouseDown('right')}>
                        <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-indigo-500 rounded-full transition-colors" />
                    </div>

                    <div className="h-full overflow-hidden flex flex-col" style={{ width: `${panelWidth}%` }}>
                        <div className="flex-1 overflow-auto rounded-xl relative m-2 ml-0 border border-gray-100 dark:border-gray-700">
                            <button onClick={() => setShowPanel(false)} className="absolute top-3 right-3 z-10 p-1 rounded-lg bg-white/80 hover:bg-gray-100 text-gray-400 hover:text-gray-600 shadow-sm border border-gray-200 transition-colors" title="Fechar painel"><X size={14} /></button>
                            <WorkflowBoard />
                        </div>
                    </div>
                </>
            )}

            {!showPanel && (
                <button onClick={() => setShowPanel(true)} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-indigo-600 hover:bg-indigo-700 text-white px-1.5 py-4 rounded-l-lg shadow-lg flex flex-col items-center gap-1 transition-colors group" title="Abrir Workflow">
                    <PanelRight size={16} />
                    <span className="text-[9px] font-bold tracking-wide writing-vertical" style={{ writingMode: 'vertical-rl' }}>WORKFLOW</span>
                </button>
            )}

            {/* === Modais === */}
            {showUploader && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Enviar Arquivo</h2>
                            <button onClick={() => setShowUploader(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-500 mb-4">{selectedFolder ? `Enviando para: ${selectedFolder.nome}` : 'O arquivo será enviado sem pasta (raiz).'}</p>
                            <FileUploader empresaId={empresaId} pastaId={selectedFolder?.id || null} onUploadComplete={() => { refresh(); setShowUploader(false) }} />
                        </div>
                    </div>
                </div>
            )}

            {showSignModal && selectedDoc && (
                <SignatureModal documentoId={selectedDoc.id} titulo={selectedDoc.titulo} extensao={selectedDoc.extensao} empresaId={empresaId} caminhoStorage={selectedDoc.caminho_storage} onClose={() => setShowSignModal(false)} onSigned={() => { refresh(); setShowSignModal(false) }} />
            )}

            {showMoveModal && selectedDoc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FolderInput size={20} /> Mover "{selectedDoc.titulo}"</h2>
                            <button onClick={() => setShowMoveModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={20} /></button>
                        </div>
                        <div className="p-4 max-h-[400px] overflow-y-auto space-y-1">
                            <button onClick={() => handleMove(null, 'Geral')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${!selectedDoc.pasta_id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}`}><FileText size={16} className="text-gray-400" /> Raiz (sem pasta)</button>
                            {pastas.map(p => (
                                <button key={p.id} onClick={() => handleMove(p.id, p.nome)} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${selectedDoc.pasta_id === p.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}`} style={{ paddingLeft: p.pasta_pai_id ? '2.5rem' : '1rem' }}><FolderInput size={16} className="text-indigo-400" /> {p.nome} {selectedDoc.pasta_id === p.id && <span className="text-xs text-indigo-500 ml-auto">atual</span>}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
