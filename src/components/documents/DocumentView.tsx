import { useState, useEffect } from "react"
import { Download, Trash2, Pen, Eye, FileText, Loader2, FolderInput, X } from "lucide-react"
import { supabase } from '@/lib/supabase'
import { VersionHistory } from './VersionHistory'
import { SignatureVerifier } from './SignatureVerifier'

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

interface DocumentViewProps {
    doc: Documento
    empresaId: string
    onRename: (doc: Documento) => void
    onDownload: (doc: Documento) => void
    onDelete: (doc: Documento) => void
    onShowSignModal: (doc: Documento) => void
    onShowMoveModal: (doc: Documento) => void
    onClose: () => void
    refreshTrigger: number
    refresh: () => void
}

export function DocumentView({ doc, empresaId, onRename, onDownload, onDelete, onShowSignModal, onShowMoveModal, onClose, refreshTrigger, refresh }: DocumentViewProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loadingPreview, setLoadingPreview] = useState(false)

    const PREVIEWABLE = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'docx', 'doc', 'xlsx', 'xls', 'pptx']
    const OFFICE_TYPES = ['docx', 'doc', 'xlsx', 'xls', 'pptx']
    const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp']

    const isPreviewable = doc?.extensao ? PREVIEWABLE.includes(doc.extensao.toLowerCase()) : false
    const isOffice = doc?.extensao ? OFFICE_TYPES.includes(doc.extensao.toLowerCase()) : false
    const isImage = doc?.extensao ? IMAGE_TYPES.includes(doc.extensao.toLowerCase()) : false

    useEffect(() => {
        if (!doc?.caminho_storage || !isPreviewable) {
            setPreviewUrl(null)
            return
        }
        let cancelled = false
        setLoadingPreview(true)
        supabase.storage
            .from('documentos_corporativos')
            .createSignedUrl(doc.caminho_storage, 600)
            .then(({ data, error }) => {
                if (!cancelled && !error && data) setPreviewUrl(data.signedUrl)
                else setPreviewUrl(null)
            })
            .finally(() => { if (!cancelled) setLoadingPreview(false) })
        return () => { cancelled = true }
    }, [doc?.id, doc?.caminho_storage, isPreviewable, refreshTrigger])

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6 relative group">
                <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"><X size={18} /></button>
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 min-w-0 pr-8">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                            <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => onRename(doc)} title="Clique para renomear">
                                {doc.titulo}
                            </h2>
                            <div className="flex items-center flex-wrap gap-2 mt-1 text-xs lg:text-sm text-gray-500 dark:text-gray-400">
                                <span className="uppercase font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">.{doc.extensao || '?'}</span>
                                <span>{doc.tamanho}</span>
                                <span>•</span><span>v{doc.versao_atual || 1}</span>
                                {doc.assinado && (<><span>•</span><span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">✓ Assinado</span></>)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={() => onDownload(doc)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"><Download size={14} /> <span className="hidden lg:inline">Baixar</span></button>
                    <button onClick={() => onShowSignModal(doc)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50"><Pen size={14} /> <span className="hidden lg:inline">Assinar</span></button>
                    <button onClick={() => onShowMoveModal(doc)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50"><FolderInput size={14} /> <span className="hidden lg:inline">Mover</span></button>
                    <button onClick={() => onDelete(doc)} disabled={doc.assinado} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-medium rounded-lg lg:ml-auto ${doc.assinado ? 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-50' : 'text-red-600 bg-white border border-red-200 hover:bg-red-50'}`}>{doc.assinado ? '🔒' : <Trash2 size={14} />} <span className="hidden lg:inline">Excluir</span></button>
                </div>
            </div>

            {isPreviewable && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col" style={{ minHeight: '300px' }}>
                    <div className="flex items-center justify-between px-4 lg:px-6 py-2 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="text-xs lg:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Eye size={14} /> Visualização</h3>
                    </div>
                    {loadingPreview ? (<div className="flex-1 flex items-center justify-center p-8"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>)
                        : previewUrl ? (
                            <div className="bg-gray-100 dark:bg-gray-900 flex-1 flex flex-col">
                                {isImage ? (<img src={previewUrl} alt={doc.titulo} className="w-full h-full object-contain p-2" style={{ maxHeight: '500px' }} />)
                                    : isOffice ? (<iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`} className="w-full flex-1 border-0" style={{ minHeight: '400px' }} title="Preview" />)
                                        : (<iframe src={previewUrl} className="w-full flex-1 border-0" style={{ minHeight: '400px' }} title="Preview" />)}
                            </div>
                        ) : (<div className="flex-1 flex items-center justify-center p-8 text-sm text-gray-400">Não foi possível carregar o preview.</div>)}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
                <VersionHistory documentoId={doc.id} empresaId={empresaId} titulo={doc.titulo} extensao={doc.extensao} isAssinado={doc.assinado} onNewVersion={refresh} />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
                <SignatureVerifier documentoId={doc.id} caminhoStorage={doc.caminho_storage} />
            </div>
        </div>
    )
}
