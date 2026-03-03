import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Clock, Download, Upload, Loader2, User } from 'lucide-react'

const MAX_VERSIONS = 10
const MAX_DAYS = 30

interface Version {
    id: string
    versao: number
    url_arquivo: string
    tamanho: string
    enviado_por: string | null
    created_at: string
    perfil?: { nome_completo: string } | null
}

interface VersionHistoryProps {
    documentoId: string
    empresaId: string
    titulo: string
    extensao: string | null
    isAssinado?: boolean
    onNewVersion: () => void
}

export function VersionHistory({ documentoId, empresaId, titulo, extensao, isAssinado, onNewVersion }: VersionHistoryProps) {
    const [versions, setVersions] = useState<Version[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        fetchVersions()
    }, [documentoId])

    const fetchVersions = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('documento_versoes')
                .select('*, perfil:enviado_por(nome_completo)')
                .eq('documento_id', documentoId)
                .order('versao', { ascending: false })

            if (error) throw error
            setVersions(data || [])
        } catch (e) {
            console.error('Erro ao carregar versões:', e)
        } finally {
            setLoading(false)
        }
    }

    // === AUTO-CLEANUP: remove versões > 10 ou > 30 dias ===
    const cleanupOldVersions = async (allVersions: Version[]) => {
        if (allVersions.length <= 1) return // nunca apagar a única versão

        const now = Date.now()
        const thirtyDaysMs = MAX_DAYS * 24 * 60 * 60 * 1000

        const toDelete: Version[] = []

        allVersions.forEach((v, idx) => {
            if (idx === 0) return // nunca apaga a versão atual

            const age = now - new Date(v.created_at).getTime()
            const isOld = age > thirtyDaysMs
            const isExcess = idx >= MAX_VERSIONS

            if (isOld || isExcess) {
                toDelete.push(v)
            }
        })

        for (const v of toDelete) {
            try {
                // Apagar arquivo do Storage
                await supabase.storage
                    .from('documentos_corporativos')
                    .remove([v.url_arquivo])

                // Apagar registro do banco
                await supabase
                    .from('documento_versoes')
                    .delete()
                    .eq('id', v.id)
            } catch (e) {
                console.error(`Erro ao limpar versão ${v.versao}:`, e)
            }
        }

        if (toDelete.length > 0) {
            console.log(`🧹 Limpeza: ${toDelete.length} versão(ões) antiga(s) removida(s)`)
        }
    }

    const handleDownloadVersion = async (version: Version) => {
        try {
            const { data, error } = await supabase.storage
                .from('documentos_corporativos')
                .download(version.url_arquivo)

            if (error) throw error

            const url = URL.createObjectURL(data)
            const a = document.createElement('a')
            a.href = url
            a.download = `${titulo}_v${version.versao}.${extensao || 'bin'}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (e) {
            console.error('Erro no download:', e)
            alert('Erro ao baixar versão.')
        }
    }

    const handleUploadNewVersion = async () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = extensao ? `.${extensao}` : '*'
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0]
            if (!file) return

            setUploading(true)
            try {
                const nextVersion = (versions[0]?.versao || 0) + 1
                const ext = file.name.split('.').pop()?.toLowerCase() || extensao || 'bin'
                const storagePath = `${empresaId}/${documentoId}_v${nextVersion}.${ext}`

                // 1. Upload do arquivo
                const { error: storageError } = await supabase.storage
                    .from('documentos_corporativos')
                    .upload(storagePath, file, { upsert: false })

                if (storageError) throw storageError

                // 2. Criar registro de versão
                const userId = (await supabase.auth.getUser()).data.user?.id || null

                const { error: versionError } = await supabase
                    .from('documento_versoes')
                    .insert({
                        documento_id: documentoId,
                        versao: nextVersion,
                        url_arquivo: storagePath,
                        tamanho: formatSize(file.size),
                        enviado_por: userId
                    })

                if (versionError) throw versionError

                // 3. Atualizar versao_atual + metadata do documento
                await supabase
                    .from('documentos')
                    .update({
                        versao_atual: nextVersion,
                        tamanho: formatSize(file.size),
                        caminho_storage: storagePath,
                        atualizado_por: userId
                    })
                    .eq('id', documentoId)

                // 4. Auto-cleanup de versões antigas
                const updatedVersions = [
                    { id: 'new', versao: nextVersion, url_arquivo: storagePath, tamanho: '', enviado_por: userId, created_at: new Date().toISOString() },
                    ...versions
                ]
                await cleanupOldVersions(updatedVersions)

                fetchVersions()
                onNewVersion()
            } catch (err: any) {
                console.error('Erro no upload de nova versão:', err)
                alert('Erro ao enviar nova versão: ' + err.message)
            } finally {
                setUploading(false)
            }
        }
        input.click()
    }

    // Calcular dias restantes até expirar
    const daysUntilExpiry = (createdAt: string) => {
        const age = Date.now() - new Date(createdAt).getTime()
        const remaining = MAX_DAYS - Math.floor(age / (24 * 60 * 60 * 1000))
        return Math.max(0, remaining)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Clock size={16} /> Histórico de Versões
                    <span className="text-xs font-normal text-gray-400">(máx. {MAX_VERSIONS}, {MAX_DAYS} dias)</span>
                </h3>
                <button
                    onClick={handleUploadNewVersion}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Nova Versão
                </button>
            </div>

            {loading ? (
                <div className="text-sm text-gray-400 animate-pulse py-4 text-center">Carregando...</div>
            ) : versions.length === 0 ? (
                <div className="text-sm text-gray-400 py-4 text-center">Nenhuma versão registrada.</div>
            ) : (
                <div className="space-y-2">
                    {versions.map((v, idx) => {
                        const days = daysUntilExpiry(v.created_at)
                        const isExpiringSoon = days <= 5 && idx > 0

                        return (
                            <div
                                key={v.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors
                                    ${idx === 0
                                        ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                    ${idx === 0 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                    v{v.versao}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        {idx === 0 && (
                                            <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-1.5 py-0.5 rounded font-medium">
                                                Atual
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {v.tamanho}
                                        </span>
                                        {isExpiringSoon && (
                                            <span className="text-xs text-amber-600 dark:text-amber-400">
                                                ⏳ {days}d restantes
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                                        <User size={12} />
                                        <span>{(v as any).perfil?.nome_completo || 'Usuário'}</span>
                                        <span>•</span>
                                        <span>{new Date(v.created_at).toLocaleString('pt-BR')}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDownloadVersion(v)}
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors shrink-0"
                                    title={`Baixar v${v.versao}`}
                                >
                                    <Download size={16} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {isAssinado && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                    🔒 Documento assinado — versões e arquivos protegidos contra exclusão.
                </div>
            )}
        </div>
    )
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
