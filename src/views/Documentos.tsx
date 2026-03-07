import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { trackEvent } from '@/lib/analytics'
import {
    Download, Trash2, Pen, Upload, Eye,
    FileText, Info, ChevronRight, X, Loader2, FolderInput
} from 'lucide-react'

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

const GENERAL_FOLDER_NAME = 'Geral'

const normalizeText = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const isProtectedDocument = (doc: Documento) => normalizeText(doc.titulo).startsWith('termo de uso')

export default function DocumentosPage() {
    const empresaId = typeof window !== 'undefined' ? (localStorage.getItem('solutia_empresa_id') || '') : ''

    // --- Analytics: registra acesso à página ---
    useEffect(() => { trackEvent('view_documentos') }, [])

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
    const generalFolder = pastas.find((p) => normalizeText(p.nome) === normalizeText(GENERAL_FOLDER_NAME))

    // Auto-load preview when document is selected
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

    // Fetch pastas for move modal
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

        // Bloquear exclusão de documentos assinados
        if (selectedDoc.assinado) {
            alert('🔒 Documento assinado não pode ser excluído. A assinatura garante a integridade e permanência do documento.')
            return
        }

        if (isProtectedDocument(selectedDoc)) {
            alert('🔒 O arquivo "Termo de Uso" é obrigatório e não pode ser excluído.')
            return
        }

        if (!confirm(`Excluir "${selectedDoc.titulo}" permanentemente?`)) return

        try {
            const userId = (await supabase.auth.getUser()).data.user?.id || null

            // Soft delete com registro de quem deletou
            const { error } = await supabase
                .from('documentos')
                .update({
                    deleted_at: new Date().toISOString(),
                    deletado_por: userId
                })
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
        <div className="h-[calc(100vh-80px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Gerenciador de Documentos
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Organize, versione e assine seus documentos
                    </p>
                </div>
                <button
                    onClick={() => setShowUploader(true)}
                    className="flex items-center gap-2 bg-indigo-600 shadow-lg shadow-indigo-600/30 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
                >
                    <Upload size={18} /> Enviar Arquivo
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Document Tree */}
                <div className="w-72 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col shrink-0">
                    <DocumentTree
                        empresaId={empresaId}
                        viewKey="documentos"
                        onSelectDocument={(doc) => { setSelectedDoc(doc); setSelectedFolder(null) }}
                        onSelectFolder={(pasta) => { setSelectedFolder(pasta); setSelectedDoc(null) }}
                        selectedDocId={selectedDoc?.id}
                        selectedFolderId={selectedFolder?.id}
                        refreshTrigger={refreshTrigger}
                    />
                </div>

                {/* Right Panel: Details / Actions */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
                    {selectedDoc ? (
                        /* === DOCUMENT DETAIL VIEW === */
                        <div className="max-w-3xl mx-auto space-y-6">
                            {/* Doc Header */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4 min-w-0">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                                            <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
                                        </div>
                                        <div className="min-w-0">
                                            <h2
                                                className="text-xl font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 transition-colors"
                                                onClick={handleRenameDoc}
                                                title="Clique para renomear"
                                            >
                                                {selectedDoc.titulo}
                                            </h2>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="uppercase font-medium text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                    .{selectedDoc.extensao || '?'}
                                                </span>
                                                <span>{selectedDoc.tamanho}</span>
                                                <span>•</span>
                                                <span>v{selectedDoc.versao_atual || 1}</span>
                                                {selectedDoc.assinado && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                                            ✓ Assinado
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                    >
                                        <Download size={16} /> Baixar
                                    </button>

                                    <button
                                        onClick={() => setShowSignModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <Pen size={16} /> Assinar
                                    </button>
                                    <button
                                        onClick={() => setShowMoveModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <FolderInput size={16} /> Mover
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={selectedDoc.assinado || isProtectedDocument(selectedDoc)}
                                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ml-auto
                                            ${selectedDoc.assinado || isProtectedDocument(selectedDoc)
                                                ? 'text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 cursor-not-allowed opacity-50'
                                                : 'text-red-600 bg-white dark:bg-gray-700 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20'
                                            }`}
                                        title={selectedDoc.assinado
                                            ? 'Documento assinado não pode ser excluído'
                                            : isProtectedDocument(selectedDoc)
                                                ? 'Termo de Uso não pode ser excluído'
                                                : 'Excluir documento'}
                                    >
                                        {selectedDoc.assinado || isProtectedDocument(selectedDoc) ? '🔒' : <Trash2 size={16} />} Excluir
                                    </button>
                                </div>
                            </div>

                            {/* Inline Preview */}
                            {isPreviewable && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-700">
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <Eye size={16} /> Visualização
                                        </h3>
                                    </div>
                                    {loadingPreview ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 size={24} className="animate-spin text-indigo-500" />
                                        </div>
                                    ) : previewUrl ? (
                                        <div className="bg-gray-100 dark:bg-gray-900">
                                            {isImage ? (
                                                <img src={previewUrl} alt={selectedDoc.titulo} className="w-full max-h-[500px] object-contain p-4" />
                                            ) : isOffice ? (
                                                <iframe
                                                    src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                                                    className="w-full h-[600px] border-0"
                                                    title="Preview do documento"
                                                />
                                            ) : (
                                                <iframe src={previewUrl} className="w-full h-[600px] border-0" title="Preview do documento" />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-sm text-gray-400">Não foi possível carregar o preview.</div>
                                    )}
                                </div>
                            )}

                            {!isPreviewable && selectedDoc.extensao && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
                                    <Eye size={24} className="text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">
                                        Preview não disponível para arquivos <strong>.{selectedDoc.extensao}</strong>.
                                        Use o botão <strong>Baixar</strong> para abrir no seu editor favorito.
                                    </p>
                                </div>
                            )}

                            {/* Version History */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <VersionHistory
                                    documentoId={selectedDoc.id}
                                    empresaId={empresaId}
                                    titulo={selectedDoc.titulo}
                                    extensao={selectedDoc.extensao}
                                    isAssinado={selectedDoc.assinado}
                                    onNewVersion={refresh}
                                />
                            </div>

                            {/* Signatures */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <SignatureVerifier
                                    documentoId={selectedDoc.id}
                                    caminhoStorage={selectedDoc.caminho_storage}
                                />
                            </div>
                        </div>
                    ) : selectedFolder ? (
                        /* === FOLDER VIEW (with uploader) === */
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>Pastas</span> <ChevronRight size={14} /> <span className="font-medium text-gray-700 dark:text-gray-200">{selectedFolder.nome}</span>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Upload size={20} className="text-indigo-500" /> Enviar para "{selectedFolder.nome}"
                                </h3>
                                <FileUploader
                                    empresaId={empresaId}
                                    pastaId={selectedFolder.id}
                                    onUploadComplete={refresh}
                                />
                            </div>
                        </div>
                    ) : (
                        /* === EMPTY STATE === */
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                                <Info size={32} className="text-indigo-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Selecione uma pasta ou documento
                            </h2>
                            <p className="text-sm text-gray-400 max-w-md">
                                Use a árvore à esquerda para navegar pelas pastas, ou clique em <strong>"Enviar Arquivo"</strong> para fazer upload.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Upload Modal (global) */}
            {showUploader && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Enviar Arquivo</h2>
                            <button onClick={() => setShowUploader(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-500 mb-4">
                                {selectedFolder
                                    ? `Enviando para: ${selectedFolder.nome}`
                                    : `O arquivo será enviado para: ${GENERAL_FOLDER_NAME}.`}
                            </p>
                            <FileUploader
                                empresaId={empresaId}
                                pastaId={selectedFolder?.id || generalFolder?.id || null}
                                onUploadComplete={() => { refresh(); setShowUploader(false) }}
                            />
                        </div>
                    </div>
                </div>
            )}


            {/* Signature Modal */}
            {showSignModal && selectedDoc && (
                <SignatureModal
                    documentoId={selectedDoc.id}
                    titulo={selectedDoc.titulo}
                    extensao={selectedDoc.extensao}
                    empresaId={empresaId}
                    caminhoStorage={selectedDoc.caminho_storage}
                    onClose={() => setShowSignModal(false)}
                    onSigned={() => { refresh(); setShowSignModal(false) }}
                />
            )}

            {/* Move to Folder Modal */}
            {showMoveModal && selectedDoc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <FolderInput size={20} /> Mover "{selectedDoc.titulo}"
                            </h2>
                            <button onClick={() => setShowMoveModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 max-h-[400px] overflow-y-auto space-y-1">
                            {generalFolder && (
                                <button
                                    onClick={() => handleMove(generalFolder.id, GENERAL_FOLDER_NAME)}
                                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                                        ${selectedDoc.pasta_id === generalFolder.id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                                >
                                    <FileText size={16} className="text-gray-400" /> {GENERAL_FOLDER_NAME}
                                </button>
                            )}
                            {pastas.filter((p) => p.id !== generalFolder?.id).map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handleMove(p.id, p.nome)}
                                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                                        ${selectedDoc.pasta_id === p.id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                                    style={{ paddingLeft: p.pasta_pai_id ? '2.5rem' : '1rem' }}
                                >
                                    <FolderInput size={16} className="text-indigo-400" /> {p.nome}
                                    {selectedDoc.pasta_id === p.id && <span className="text-xs text-indigo-500 ml-auto">atual</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
