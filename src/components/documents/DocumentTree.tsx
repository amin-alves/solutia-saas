import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Folder, FolderOpen, FileText, FileSpreadsheet, FileImage,
    File, ChevronRight, ChevronDown, Plus, Edit2, Trash2,
    MoreVertical, FolderPlus, Copy, Clipboard
} from 'lucide-react'

interface Pasta {
    id: string
    nome: string
    pasta_pai_id: string | null
    empresa_id: string
    children?: Pasta[]
}

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

interface DocumentTreeProps {
    empresaId: string
    onSelectDocument: (doc: Documento) => void
    onSelectFolder: (pasta: Pasta | null) => void
    selectedDocId?: string | null
    selectedFolderId?: string | null
    refreshTrigger?: number
}

// Clipboard global para copy/paste
let clipboard: { type: 'file' | 'folder', id: string, name: string, action: 'copy' } | null = null

const FILE_ICONS: Record<string, any> = {
    pdf: <FileText className="text-red-500" size={18} />,
    docx: <FileText className="text-blue-500" size={18} />,
    doc: <FileText className="text-blue-500" size={18} />,
    xlsx: <FileSpreadsheet className="text-green-500" size={18} />,
    xls: <FileSpreadsheet className="text-green-500" size={18} />,
    jpg: <FileImage className="text-purple-500" size={18} />,
    jpeg: <FileImage className="text-purple-500" size={18} />,
    png: <FileImage className="text-purple-500" size={18} />,
}

function getFileIcon(ext: string | null) {
    if (!ext) return <File size={18} className="text-gray-400" />
    return FILE_ICONS[ext.toLowerCase()] || <File size={18} className="text-gray-400" />
}

function buildTree(pastas: Pasta[]): Pasta[] {
    const map = new Map<string, Pasta>()
    const roots: Pasta[] = []

    pastas.forEach(p => map.set(p.id, { ...p, children: [] }))

    map.forEach(p => {
        if (p.pasta_pai_id && map.has(p.pasta_pai_id)) {
            map.get(p.pasta_pai_id)!.children!.push(p)
        } else {
            roots.push(p)
        }
    })

    // Ordenar filhos recursivamente por nome
    const sortChildren = (nodes: Pasta[]) => {
        nodes.sort((a, b) => a.nome.localeCompare(b.nome))
        nodes.forEach(n => { if (n.children?.length) sortChildren(n.children) })
    }
    sortChildren(roots)

    return roots
}

function sortDocs(docs: Documento[]): Documento[] {
    return [...docs].sort((a, b) => {
        const extA = (a.extensao || '').toLowerCase()
        const extB = (b.extensao || '').toLowerCase()
        if (extA !== extB) return extA.localeCompare(extB)
        return a.titulo.localeCompare(b.titulo)
    })
}

// =====================================================
// Context Menu component
// =====================================================
function ContextMenu({
    x, y, items, onClose
}: {
    x: number; y: number
    items: { label: string; icon: any; onClick: () => void; danger?: boolean; disabled?: boolean }[]
    onClose: () => void
}) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener('mousedown', handle)
        return () => document.removeEventListener('mousedown', handle)
    }, [onClose])

    return (
        <div
            ref={ref}
            className="fixed z-[200] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
            style={{ left: x, top: y }}
        >
            {items.map((item, i) => (
                <button
                    key={i}
                    onClick={() => { item.onClick(); onClose() }}
                    disabled={item.disabled}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                        ${item.danger
                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                >
                    {item.icon}
                    {item.label}
                </button>
            ))}
        </div>
    )
}

// =====================================================
// Draggable Document Row (with right-click context menu)
// =====================================================
function DraggableDoc({
    doc, level, selectedDocId, onSelectDocument, onCopy, onRename, onDelete
}: {
    doc: Documento; level: number; selectedDocId?: string | null
    onSelectDocument: (doc: Documento) => void
    onCopy: (doc: Documento) => void
    onRename: (doc: Documento) => void
    onDelete: (doc: Documento) => void
}) {
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)

    return (
        <>
            <div
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData('application/doc-id', doc.id)
                    e.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => onSelectDocument(doc)}
                onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCtxMenu({ x: e.clientX, y: e.clientY })
                }}
                className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-grab active:cursor-grabbing transition-colors
                    ${selectedDocId === doc.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
                {getFileIcon(doc.extensao)}
                <span className="text-sm truncate flex-1">{doc.titulo}</span>
                {doc.assinado && (
                    <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">✓</span>
                )}
            </div>

            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x} y={ctxMenu.y}
                    onClose={() => setCtxMenu(null)}
                    items={[
                        { label: 'Copiar', icon: <Copy size={14} />, onClick: () => onCopy(doc) },
                        { label: 'Renomear', icon: <Edit2 size={14} />, onClick: () => onRename(doc) },
                        { label: 'Excluir', icon: <Trash2 size={14} />, onClick: () => onDelete(doc), danger: true, disabled: doc.assinado },
                    ]}
                />
            )}
        </>
    )
}

// =====================================================
// Folder Node (drag+drop + right-click context menu)
// =====================================================
function FolderNode({
    pasta, documentos, level = 0,
    selectedDocId, selectedFolderId,
    onSelectDocument, onSelectFolder,
    onRename, onDelete, onCreateSubfolder,
    onMoveDoc, onMoveFolder, onPaste,
    onCopyFile, onRenameFile, onDeleteFile
}: {
    pasta: Pasta; documentos: Documento[]; level?: number
    selectedDocId?: string | null; selectedFolderId?: string | null
    onSelectDocument: (doc: Documento) => void
    onSelectFolder: (pasta: Pasta) => void
    onRename: (pasta: Pasta) => void
    onDelete: (pasta: Pasta) => void
    onCreateSubfolder: (pastaPaiId: string) => void
    onMoveDoc: (docId: string, targetPastaId: string | null, targetPastaNome: string) => void
    onMoveFolder: (folderId: string, targetPastaId: string | null) => void
    onPaste: (targetPastaId: string) => void
    onCopyFile: (doc: Documento) => void
    onRenameFile: (doc: Documento) => void
    onDeleteFile: (doc: Documento) => void
}) {
    const [expanded, setExpanded] = useState(level === 0)
    const [dragOver, setDragOver] = useState(false)
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)
    const isSelected = selectedFolderId === pasta.id
    const folderDocs = sortDocs(documentos.filter(d => d.pasta_id === pasta.id))

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        setDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.stopPropagation()
        setDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
        const docId = e.dataTransfer.getData('application/doc-id')
        const folderId = e.dataTransfer.getData('application/folder-id')
        if (docId) {
            onMoveDoc(docId, pasta.id, pasta.nome)
            setExpanded(true)
        } else if (folderId && folderId !== pasta.id) {
            onMoveFolder(folderId, pasta.id)
            setExpanded(true)
        }
    }

    return (
        <div>
            <div
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData('application/folder-id', pasta.id)
                    e.dataTransfer.effectAllowed = 'move'
                    // DO NOT stopPropagation here — it prevents the drag from starting in nested scenarios
                }}
                className={`flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer group transition-all duration-150
                    ${dragOver
                        ? 'bg-indigo-100 dark:bg-indigo-800/40 ring-2 ring-indigo-400 scale-[1.02]'
                        : isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={() => {
                    setExpanded(!expanded)
                    onSelectFolder(pasta)
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCtxMenu({ x: e.clientX, y: e.clientY })
                }}
            >
                <span className="shrink-0 text-gray-400">
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                {expanded
                    ? <FolderOpen size={18} className={dragOver ? 'text-indigo-600' : 'text-indigo-500'} />
                    : <Folder size={18} className={dragOver ? 'text-indigo-600' : 'text-indigo-400'} />
                }
                <span className="text-sm font-medium truncate flex-1 ml-1">
                    {pasta.nome}
                    {dragOver && <span className="text-xs text-indigo-500 ml-1">← soltar aqui</span>}
                </span>
                <span className="text-xs text-gray-400 mr-1">{folderDocs.length}</span>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        setCtxMenu({ x: e.clientX, y: e.clientY })
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                    <MoreVertical size={14} />
                </button>
            </div>

            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x} y={ctxMenu.y}
                    onClose={() => setCtxMenu(null)}
                    items={[
                        { label: 'Nova Subpasta', icon: <FolderPlus size={14} />, onClick: () => onCreateSubfolder(pasta.id) },
                        { label: 'Colar aqui', icon: <Clipboard size={14} />, onClick: () => onPaste(pasta.id), disabled: !clipboard },
                        { label: 'Renomear', icon: <Edit2 size={14} />, onClick: () => onRename(pasta) },
                        { label: 'Excluir', icon: <Trash2 size={14} />, onClick: () => onDelete(pasta), danger: true },
                    ]}
                />
            )}

            {expanded && (
                <div>
                    {pasta.children?.map(child => (
                        <FolderNode
                            key={child.id}
                            pasta={child}
                            documentos={documentos}
                            level={level + 1}
                            selectedDocId={selectedDocId}
                            selectedFolderId={selectedFolderId}
                            onSelectDocument={onSelectDocument}
                            onSelectFolder={onSelectFolder}
                            onRename={onRename}
                            onDelete={onDelete}
                            onCreateSubfolder={onCreateSubfolder}
                            onMoveDoc={onMoveDoc}
                            onMoveFolder={onMoveFolder}
                            onPaste={onPaste}
                            onCopyFile={onCopyFile}
                            onRenameFile={onRenameFile}
                            onDeleteFile={onDeleteFile}
                        />
                    ))}

                    {folderDocs.map(doc => (
                        <DraggableDoc
                            key={doc.id}
                            doc={doc}
                            level={level + 1}
                            selectedDocId={selectedDocId}
                            onSelectDocument={onSelectDocument}
                            onCopy={onCopyFile}
                            onRename={onRenameFile}
                            onDelete={onDeleteFile}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// =====================================================
// Main DocumentTree
// =====================================================
export function DocumentTree({ empresaId, onSelectDocument, onSelectFolder, selectedDocId, selectedFolderId, refreshTrigger }: DocumentTreeProps) {
    const [pastas, setPastas] = useState<Pasta[]>([])
    const [documentos, setDocumentos] = useState<Documento[]>([])
    const [loading, setLoading] = useState(true)
    const [rootDragOver, setRootDragOver] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [pastasRes, docsRes, assinaturasRes] = await Promise.all([
                supabase.from('pastas').select('*').eq('empresa_id', empresaId),
                supabase.from('documentos').select('*').eq('empresa_id', empresaId).is('deleted_at', null),
                supabase.from('assinaturas').select('documento_id')
            ])

            if (pastasRes.data) setPastas(pastasRes.data)

            if (docsRes.data) {
                const assinadosSet = new Set((assinaturasRes.data || []).map(a => a.documento_id))
                setDocumentos(docsRes.data.map(d => ({ ...d, assinado: assinadosSet.has(d.id) })))
            }
        } catch (e) {
            console.error('Erro ao carregar árvore:', e)
        } finally {
            setLoading(false)
        }
    }, [empresaId])

    useEffect(() => { fetchData() }, [fetchData, refreshTrigger])

    const tree = buildTree(pastas)
    const rootDocs = sortDocs(documentos.filter(d => !d.pasta_id))

    // === DUPLICATE CHECK ===
    const hasDuplicateName = (titulo: string, pastaId: string | null): boolean => {
        return documentos.some(d => d.titulo === titulo && d.pasta_id === pastaId)
    }

    // === MOVE DOCUMENT ===
    const handleMoveDoc = async (docId: string, targetPastaId: string | null, targetPastaNome: string) => {
        const doc = documentos.find(d => d.id === docId)
        if (doc && hasDuplicateName(doc.titulo, targetPastaId)) {
            alert(`Já existe um arquivo "${doc.titulo}" nesta pasta.`)
            return
        }

        const { error } = await supabase
            .from('documentos')
            .update({ pasta_id: targetPastaId, pasta: targetPastaNome })
            .eq('id', docId)

        if (error) console.error('Erro ao mover documento:', error)
        else fetchData()
    }

    // === MOVE FOLDER ===
    const isDescendant = (folderId: string, potentialParentId: string): boolean => {
        let current = pastas.find(p => p.id === potentialParentId)
        while (current) {
            if (current.id === folderId) return true
            if (!current.pasta_pai_id) break
            current = pastas.find(p => p.id === current!.pasta_pai_id)
        }
        return false
    }

    const handleMoveFolder = async (folderId: string, targetPastaId: string | null) => {
        if (folderId === targetPastaId) return
        if (targetPastaId && isDescendant(folderId, targetPastaId)) {
            alert('Não é possível mover uma pasta para dentro de si mesma.')
            return
        }

        const { error } = await supabase
            .from('pastas')
            .update({ pasta_pai_id: targetPastaId })
            .eq('id', folderId)

        if (error) console.error('Erro ao mover pasta:', error)
        else fetchData()
    }

    // === COPY FILE ===
    const handleCopyFile = (doc: Documento) => {
        clipboard = { type: 'file', id: doc.id, name: doc.titulo, action: 'copy' }
    }

    // === PASTE ===
    const handlePaste = async (targetPastaId: string) => {
        if (!clipboard) return

        if (clipboard.type === 'file') {
            const original = documentos.find(d => d.id === clipboard!.id)
            if (!original) return

            // Generate unique name
            let newName = original.titulo
            let counter = 1
            while (hasDuplicateName(newName, targetPastaId)) {
                const ext = original.extensao ? `.${original.extensao}` : ''
                const baseName = original.titulo.replace(ext, '')
                newName = `${baseName} (${counter})${ext}`
                counter++
            }

            const targetPasta = pastas.find(p => p.id === targetPastaId)

            const { error } = await supabase.from('documentos').insert({
                empresa_id: empresaId,
                titulo: newName,
                pasta_id: targetPastaId,
                pasta: targetPasta?.nome || 'Geral',
                extensao: original.extensao,
                mime_type: original.mime_type,
                tamanho: original.tamanho,
                status: original.status,
                caminho_storage: original.caminho_storage,
            })

            if (error) alert('Erro ao colar: ' + error.message)
            else fetchData()
        }

        clipboard = null
    }

    // === RENAME FILE ===
    const handleRenameFile = async (doc: Documento) => {
        const novoNome = prompt('Novo nome do arquivo:', doc.titulo)
        if (!novoNome?.trim() || novoNome === doc.titulo) return

        if (hasDuplicateName(novoNome.trim(), doc.pasta_id)) {
            alert(`Já existe um arquivo "${novoNome.trim()}" nesta pasta.`)
            return
        }

        const { error } = await supabase.from('documentos').update({ titulo: novoNome.trim() }).eq('id', doc.id)
        if (error) alert('Erro: ' + error.message)
        else fetchData()
    }

    // === DELETE FILE ===
    const handleDeleteFile = async (doc: Documento) => {
        if (doc.assinado) {
            alert('Documentos assinados não podem ser excluídos.')
            return
        }
        if (!confirm(`Excluir "${doc.titulo}"?`)) return

        const { error } = await supabase.from('documentos')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', doc.id)
        if (error) alert('Erro: ' + error.message)
        else fetchData()
    }

    // === FOLDER OPS ===
    const handleCreateSubfolder = async (pastaPaiId: string) => {
        const nome = prompt('Nome da nova subpasta:')
        if (!nome?.trim()) return

        const { error } = await supabase.from('pastas').insert({
            empresa_id: empresaId,
            nome: nome.trim(),
            pasta_pai_id: pastaPaiId
        })

        if (error) alert('Erro ao criar subpasta: ' + error.message)
        else fetchData()
    }

    const handleCreateRootFolder = async () => {
        const nome = prompt('Nome da nova pasta:')
        if (!nome?.trim()) return

        const { error } = await supabase.from('pastas').insert({
            empresa_id: empresaId,
            nome: nome.trim(),
            pasta_pai_id: null
        })

        if (error) alert('Erro ao criar pasta: ' + error.message)
        else fetchData()
    }

    const handleRename = async (pasta: Pasta) => {
        const novoNome = prompt('Novo nome:', pasta.nome)
        if (!novoNome?.trim() || novoNome === pasta.nome) return

        const { error } = await supabase.from('pastas').update({ nome: novoNome.trim() }).eq('id', pasta.id)
        if (error) alert('Erro: ' + error.message)
        else fetchData()
    }

    const handleDelete = async (pasta: Pasta) => {
        if (!confirm(`Excluir a pasta "${pasta.nome}" e todo o conteúdo?`)) return

        const { error } = await supabase.from('pastas').delete().eq('id', pasta.id)
        if (error) alert('Erro: ' + error.message)
        else fetchData()
    }

    if (loading) {
        return <div className="p-4 text-sm text-gray-400 animate-pulse">Carregando árvore...</div>
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Pastas
                </span>
                <button
                    onClick={handleCreateRootFolder}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-indigo-600 transition-colors"
                    title="Nova Pasta"
                >
                    <Plus size={16} />
                </button>
            </div>

            <div
                className="flex-1 overflow-y-auto py-2 px-1 space-y-0.5"
                onContextMenu={(e) => {
                    // Prevent browser default context menu on blank area
                    e.preventDefault()
                }}
            >
                {tree.map(pasta => (
                    <FolderNode
                        key={pasta.id}
                        pasta={pasta}
                        documentos={documentos}
                        selectedDocId={selectedDocId}
                        selectedFolderId={selectedFolderId}
                        onSelectDocument={onSelectDocument}
                        onSelectFolder={onSelectFolder}
                        onRename={handleRename}
                        onDelete={handleDelete}
                        onCreateSubfolder={handleCreateSubfolder}
                        onMoveDoc={handleMoveDoc}
                        onMoveFolder={handleMoveFolder}
                        onPaste={handlePaste}
                        onCopyFile={handleCopyFile}
                        onRenameFile={handleRenameFile}
                        onDeleteFile={handleDeleteFile}
                    />
                ))}

                {/* Root drop zone */}
                <div
                    className={`mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 transition-all duration-150 rounded-lg
                        ${rootDragOver ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-300' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setRootDragOver(true) }}
                    onDragLeave={() => setRootDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault()
                        setRootDragOver(false)
                        const docId = e.dataTransfer.getData('application/doc-id')
                        const folderId = e.dataTransfer.getData('application/folder-id')
                        if (docId) handleMoveDoc(docId, null, 'Geral')
                        else if (folderId) handleMoveFolder(folderId, null)
                    }}
                >
                    <span className="text-xs text-gray-400 px-2 font-medium">
                        Sem pasta {rootDragOver && <span className="text-indigo-500">← soltar aqui</span>}
                    </span>
                    {rootDocs.map(doc => (
                        <DraggableDoc
                            key={doc.id}
                            doc={doc}
                            level={0}
                            selectedDocId={selectedDocId}
                            onSelectDocument={onSelectDocument}
                            onCopy={handleCopyFile}
                            onRename={handleRenameFile}
                            onDelete={handleDeleteFile}
                        />
                    ))}
                    {rootDocs.length === 0 && !rootDragOver && (
                        <div className="text-xs text-gray-300 px-2 py-1 italic">vazio</div>
                    )}
                </div>

                {tree.length === 0 && rootDocs.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-400">
                        Nenhuma pasta criada.
                    </div>
                )}
            </div>
        </div>
    )
}
