import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, X, Loader2, FileText, CheckCircle2 } from 'lucide-react'

interface FileUploaderProps {
    empresaId: string
    pastaId: string | null
    onUploadComplete: () => void
}

export function FileUploader({ empresaId, pastaId, onUploadComplete }: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [_uploading, setUploading] = useState(false)
    const [uploadQueue, setUploadQueue] = useState<{ name: string; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string }[]>([])
    const inputRef = useRef<HTMLInputElement>(null)

    const processFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return

        setUploading(true)
        const queue = files.map(f => ({ name: f.name, status: 'pending' as const }))
        setUploadQueue(queue)

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            setUploadQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item))

            try {
                const ext = file.name.split('.').pop()?.toLowerCase() || ''
                const fileId = crypto.randomUUID()
                const storagePath = `${empresaId}/${fileId}.${ext}`

                // 1. Upload para Supabase Storage
                const { error: storageError } = await supabase.storage
                    .from('documentos_corporativos')
                    .upload(storagePath, file, { upsert: false })

                if (storageError) throw storageError

                // 2. Criar registro na tabela documentos
                const docData = {
                    titulo: file.name.replace(/\.[^.]+$/, ''), // Remove extensão do título
                    empresa_id: empresaId,
                    pasta_id: pastaId,
                    pasta: 'Geral', // campo legado NOT NULL
                    status: 'finalizado',
                    extensao: ext,
                    mime_type: file.type,
                    tamanho: formatFileSize(file.size),
                    caminho_storage: storagePath,
                    versao_atual: 1,
                    data: new Date().toLocaleDateString('pt-BR')
                }

                const { data: newDoc, error: dbError } = await supabase
                    .from('documentos')
                    .insert([docData])
                    .select()

                if (dbError) throw dbError

                // 3. Criar registro na tabela de versões
                if (newDoc && newDoc[0]) {
                    await supabase.from('documento_versoes').insert({
                        documento_id: newDoc[0].id,
                        versao: 1,
                        url_arquivo: storagePath,
                        tamanho: docData.tamanho,
                        enviado_por: (await supabase.auth.getUser()).data.user?.id || null
                    })
                }

                setUploadQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'done' } : item))
            } catch (err: any) {
                console.error(`Erro no upload de ${file.name}:`, err)
                setUploadQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error', error: err.message } : item))
            }
        }

        setUploading(false)
        onUploadComplete()

        // Limpa a queue após 3s
        setTimeout(() => setUploadQueue([]), 3000)
    }, [empresaId, pastaId, onUploadComplete])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const files = Array.from(e.dataTransfer.files)
        processFiles(files)
    }, [processFiles])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            processFiles(Array.from(e.target.files))
            e.target.value = ''
        }
    }

    return (
        <div className="space-y-3">
            {/* Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                    ${isDragging
                        ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]'
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv,.odt,.ods"
                />
                <Upload className={`mx-auto mb-3 ${isDragging ? 'text-indigo-500' : 'text-gray-400'}`} size={36} />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isDragging ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    PDF, Word, Excel, Imagens e outros formatos
                </p>
            </div>

            {/* Upload Progress */}
            {uploadQueue.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {uploadQueue.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                            {item.status === 'uploading' && <Loader2 size={16} className="animate-spin text-indigo-500 shrink-0" />}
                            {item.status === 'done' && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
                            {item.status === 'error' && <X size={16} className="text-red-500 shrink-0" />}
                            {item.status === 'pending' && <FileText size={16} className="text-gray-400 shrink-0" />}
                            <span className="text-sm truncate flex-1">{item.name}</span>
                            {item.status === 'error' && (
                                <span className="text-xs text-red-500">{item.error}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
