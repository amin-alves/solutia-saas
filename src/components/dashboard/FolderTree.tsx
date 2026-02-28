import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, Folder, FileText, MoreVertical, Loader2, X, UploadCloud } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Documento {
    id: string
    titulo: string
    pasta: string
    tamanho: string
    data: string
}

interface TreeNode {
    id: string
    name: string
    type: "folder" | "file"
    children?: TreeNode[]
}

export default function FolderTree() {
    const [treeData, setTreeData] = useState<TreeNode[]>([])
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(true)
    const [folderCount, setFolderCount] = useState(0)

    // Estados do Modal
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [uploadPasta, setUploadPasta] = useState("")
    const [uploadLoading, setUploadLoading] = useState(false)
    const [existingFolders, setExistingFolders] = useState<string[]>([])

    useEffect(() => {
        fetchDocuments()
    }, [])

    const fetchDocuments = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('documentos')
                .select('*')
                .is('deleted_at', null)
                .order('pasta', { ascending: true })
                .order('titulo', { ascending: true })

            if (error) throw error

            if (data) {
                // Constroi arvore agrupando pela coluna 'pasta'
                const foldersMap = new Map<string, TreeNode>()
                const uniqueFolders = new Set<string>()
                let fCount = 0

                data.forEach((doc: Documento) => {
                    uniqueFolders.add(doc.pasta)

                    if (!foldersMap.has(doc.pasta)) {
                        foldersMap.set(doc.pasta, {
                            id: `folder-${doc.pasta}`,
                            name: doc.pasta,
                            type: "folder",
                            children: []
                        })
                        fCount++
                    }

                    foldersMap.get(doc.pasta)?.children?.push({
                        id: `file-${doc.id}`,
                        name: doc.titulo,
                        type: "file"
                    })
                })

                const tree = Array.from(foldersMap.values())
                setTreeData(tree)
                setFolderCount(fCount)
                setExistingFolders(Array.from(uniqueFolders))

                // Expande TODAS as pastas por padrão
                const initialExpanded: Record<string, boolean> = {}
                tree.forEach(node => {
                    initialExpanded[node.id] = true
                })
                setExpandedFolders(initialExpanded)
            }
        } catch (error) {
            console.error("Erro ao buscar documentos para a árvore:", error)
        } finally {
            setLoading(false)
        }
    }

    const toggleFolder = (id: string) => {
        setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes'
        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!uploadFile || !uploadPasta.trim()) return

        try {
            setUploadLoading(true)

            const empresaId = localStorage.getItem("solutia_empresa_id")

            // Pega o ID do usuário atual para a auditoria/enviado_por
            const { data: { user } } = await supabase.auth.getUser()

            // Como criamos perfis antes sem auth oficial para os testes rápidos,
            // precisamos recuperar o ID do perfil "logado" que esta no localStorage tbm
            const sessionPerfilId = localStorage.getItem("solutia_session_id")
            const userIdToUse = user?.id || sessionPerfilId

            if (!empresaId || !userIdToUse) throw new Error("Usuário ou empresa não identificados.")

            // 1. Upload do Arquivo físico pro Storage Bucket
            const fileExt = uploadFile.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
            const filePath = `${empresaId}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('documentos_corporativos')
                .upload(filePath, uploadFile)

            if (uploadError) throw uploadError

            // Pega a URL publica simulada (no bucket restrito usamos createSignedUrl na vida real, 
            // mas como é painel logado guardaremos o path)
            const fileStoragePath = filePath

            // 2. Inserir Capa na tabela 'documentos'
            const { data: newDoc, error: docError } = await supabase
                .from('documentos')
                .insert({
                    empresa_id: empresaId,
                    titulo: uploadFile.name,
                    pasta: uploadPasta.trim(),
                    tamanho: formatBytes(uploadFile.size)
                })
                .select()
                .single()

            if (docError) throw docError

            // 3. Inserir a Versão 1 do documento
            const { error: versionError } = await supabase
                .from('documento_versoes')
                .insert({
                    documento_id: newDoc.id,
                    enviado_por: userIdToUse,
                    url_arquivo: fileStoragePath,
                    tamanho: formatBytes(uploadFile.size)
                })

            if (versionError) throw versionError

            // Sucesso total
            setIsUploadModalOpen(false)
            setUploadFile(null)
            setUploadPasta("")

            // Recarrega a árvore para mostrar o arquivo novo
            fetchDocuments()

        } catch (error) {
            console.error("Erro no upload completo:", error)
            alert("Erro ao enviar documento. Tente novamente.")
        } finally {
            setUploadLoading(false)
        }
    }

    const renderNode = (node: TreeNode, depth = 0) => {
        const isExpanded = expandedFolders[node.id]
        const paddingLeft = `${depth * 1.5 + 1}rem`

        return (
            <div key={node.id}>
                <div
                    className="flex items-center group hover:bg-slate-50 py-1.5 cursor-pointer rounded-md transition-colors"
                    style={{ paddingLeft }}
                    onClick={() => node.type === "folder" ? toggleFolder(node.id) : null}
                >
                    <div className="w-5 h-5 flex items-center justify-center mr-1 text-slate-400">
                        {node.type === "folder" && (
                            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                        )}
                    </div>

                    {node.type === "folder" ? (
                        <Folder size={16} className="text-blue-500 mr-2 shrink-0" fill="currentColor" fillOpacity={0.2} />
                    ) : (
                        <FileText size={16} className="text-slate-400 mr-2 shrink-0" />
                    )}

                    <span className={`text-[13px] truncate flex-1 ${node.type === "folder" ? "font-medium text-slate-700" : "text-slate-600"}`}>
                        {node.name}
                    </span>

                    <button className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 transition-opacity mr-2 rounded">
                        <MoreVertical size={14} />
                    </button>
                </div>

                {node.type === "folder" && isExpanded && node.children && (
                    <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
                )}
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 h-full flex flex-col overflow-hidden relative">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 text-sm">Arquivos da Empresa</h3>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{folderCount} {folderCount === 1 ? 'Pasta' : 'Pastas'}</span>
            </div>

            <div className="p-2 flex-1 overflow-y-auto">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <Loader2 size={24} className="animate-spin text-blue-500" />
                        <span className="text-sm font-medium">Sincronizando pastas...</span>
                    </div>
                ) : treeData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 p-4 text-center">
                        <Folder size={32} className="text-slate-300" />
                        <span className="text-sm font-medium">Nenhum documento encontrado.</span>
                    </div>
                ) : (
                    treeData.map(node => renderNode(node))
                )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50">
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-blue-600 border border-blue-200 border-dashed rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                    <UploadCloud size={14} />
                    Novo Arquivo
                </button>
            </div>

            {/* Modal de Upload */}
            {isUploadModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800">Enviar Documento</h3>
                            <button
                                onClick={() => setIsUploadModalOpen(false)}
                                className="text-slate-400 hover:bg-slate-100 p-1 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="p-4 flex flex-col gap-4">

                            {/* Input da Pasta / Datalist */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Pasta Destino</label>
                                <input
                                    type="text"
                                    list="existing-folders"
                                    required
                                    value={uploadPasta}
                                    onChange={(e) => setUploadPasta(e.target.value)}
                                    placeholder="Ex: Contratos, DP, Financeiro..."
                                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 ring-blue-500/20 transition-all"
                                />
                                <datalist id="existing-folders">
                                    {existingFolders.map(f => (
                                        <option key={f} value={f} />
                                    ))}
                                </datalist>
                                <p className="text-[10px] text-slate-400 mt-1">Se a pasta não existir, ela será criada automaticamente.</p>
                            </div>

                            {/* Input do Arquivo */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Arquivo (PDF, Imagens, Docs)</label>
                                <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-lg px-3 py-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors relative">
                                    <input
                                        type="file"
                                        required
                                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center pointer-events-none">
                                        <UploadCloud size={24} className={uploadFile ? "text-blue-500 mb-2" : "text-slate-400 mb-2"} />
                                        {uploadFile ? (
                                            <span className="text-xs font-bold text-blue-700 truncate max-w-[200px]">{uploadFile.name}</span>
                                        ) : (
                                            <span className="text-xs font-medium text-slate-500">Clique ou arraste um arquivo</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsUploadModalOpen(false)}
                                    className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadLoading || !uploadFile || !uploadPasta}
                                    className="flex-1 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                                >
                                    {uploadLoading ? (
                                        <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                                    ) : (
                                        'Fazer Upload'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
