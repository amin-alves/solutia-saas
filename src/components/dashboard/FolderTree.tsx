import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, Folder, FileText, MoreVertical, Loader2 } from "lucide-react"
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

    useEffect(() => {
        fetchDocuments()
    }, [])

    const fetchDocuments = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('documentos')
                .select('*')
                .order('pasta', { ascending: true })
                .order('titulo', { ascending: true })

            if (error) throw error

            if (data) {
                // Constroi arvore agrupando pela coluna 'pasta'
                const foldersMap = new Map<string, TreeNode>()
                let fCount = 0

                data.forEach((doc: Documento) => {
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

                // Expande todas as pastas por padrão na inicializacao
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 h-full flex flex-col overflow-hidden">
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
                        <span className="text-sm font-medium">Nenhum documento encontrado para esta empresa.</span>
                    </div>
                ) : (
                    treeData.map(node => renderNode(node))
                )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50">
                <button className="w-full py-2 text-xs font-medium text-blue-600 border border-blue-200 border-dashed rounded bg-blue-50 hover:bg-blue-100 transition-colors">
                    + Nova Pasta / Arquivo
                </button>
            </div>
        </div>
    )
}
