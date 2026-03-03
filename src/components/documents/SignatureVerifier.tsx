import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Shield, ShieldCheck, ShieldAlert, User, Clock, Hash } from 'lucide-react'

interface Assinatura {
    id: string
    nome_assinante: string
    email_assinante: string | null
    hash_documento: string
    assinatura_imagem: string | null
    assinado_em: string
    versao_id: string | null
}

interface SignatureVerifierProps {
    documentoId: string
    caminhoStorage: string | null
}

export function SignatureVerifier({ documentoId, caminhoStorage }: SignatureVerifierProps) {
    const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
    const [loading, setLoading] = useState(true)
    const [currentHash, setCurrentHash] = useState<string | null>(null)
    const [verifying, setVerifying] = useState(false)

    useEffect(() => {
        fetchAssinaturas()
    }, [documentoId])

    const fetchAssinaturas = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('assinaturas')
                .select('*')
                .eq('documento_id', documentoId)
                .order('assinado_em', { ascending: false })

            if (error) throw error
            setAssinaturas(data || [])
        } catch (e) {
            console.error('Erro ao carregar assinaturas:', e)
        } finally {
            setLoading(false)
        }
    }

    const verifyIntegrity = async () => {
        if (!caminhoStorage) return
        setVerifying(true)
        try {
            const { data, error } = await supabase.storage
                .from('documentos_corporativos')
                .download(caminhoStorage)

            if (error) throw error

            const buffer = await data.arrayBuffer()
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
            setCurrentHash(hash)
        } catch {
            setCurrentHash('erro')
        } finally {
            setVerifying(false)
        }
    }

    if (loading) return <div className="text-sm text-gray-400 animate-pulse py-2">Carregando assinaturas...</div>

    if (assinaturas.length === 0) {
        return (
            <div className="text-sm text-gray-400 py-4 text-center flex flex-col items-center gap-2">
                <Shield size={24} className="text-gray-300" />
                <span>Nenhuma assinatura registrada.</span>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-green-500" /> Assinaturas ({assinaturas.length})
                </h3>
                <button
                    onClick={verifyIntegrity}
                    disabled={verifying}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                    {verifying ? 'Verificando...' : 'Verificar Integridade'}
                </button>
            </div>

            {currentHash && (
                <div className={`p-3 rounded-lg border text-xs ${assinaturas.some(a => a.hash_documento === currentHash)
                        ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                        : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                    }`}>
                    {assinaturas.some(a => a.hash_documento === currentHash) ? (
                        <p className="flex items-center gap-2"><ShieldCheck size={14} /> <strong>Integridade OK</strong> — o documento não foi alterado desde a assinatura.</p>
                    ) : (
                        <p className="flex items-center gap-2"><ShieldAlert size={14} /> <strong>Documento Modificado</strong> — o arquivo foi alterado após a assinatura. O hash não confere.</p>
                    )}
                </div>
            )}

            <div className="space-y-3">
                {assinaturas.map(a => (
                    <div key={a.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-start gap-3">
                            {a.assinatura_imagem ? (
                                <img
                                    src={a.assinatura_imagem}
                                    alt="Assinatura"
                                    className="w-24 h-12 object-contain border border-gray-200 dark:border-gray-700 rounded bg-white"
                                />
                            ) : (
                                <div className="w-24 h-12 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900">
                                    <span className="text-xs text-gray-400 italic" style={{ fontFamily: "'Caveat', cursive" }}>
                                        {a.nome_assinante}
                                    </span>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <User size={14} className="text-gray-400" /> {a.nome_assinante}
                                </p>
                                {a.email_assinante && (
                                    <p className="text-xs text-gray-500">{a.email_assinante}</p>
                                )}
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} /> {new Date(a.assinado_em).toLocaleString('pt-BR')}
                                    </span>
                                    <span className="flex items-center gap-1 truncate" title={a.hash_documento}>
                                        <Hash size={12} /> {a.hash_documento.substring(0, 16)}...
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
