import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Send, Inbox, ArrowRightLeft, Clock, CheckCircle2, Eye, RotateCcw, Loader2, Plus, FileText, User } from "lucide-react"
import NovaTramitacaoModal from "./NovaTramitacaoModal"

interface Tramitacao {
    id: string
    documento_id: string | null
    remetente_id: string
    destinatario_id: string
    status: string
    observacao: string | null
    prazo: string | null
    created_at: string
    documento_titulo?: string
    remetente_nome?: string
    destinatario_nome?: string
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
    'Pendente': { icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    'Recebido': { icon: Inbox, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    'Em Análise': { icon: Eye, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
    'Concluído': { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    'Devolvido': { icon: RotateCcw, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
}

export default function TramitacaoPanel() {
    const [tramitacoes, setTramitacoes] = useState<Tramitacao[]>([])
    const [loading, setLoading] = useState(true)
    const [filtro, setFiltro] = useState<'todas' | 'enviadas' | 'recebidas'>('todas')
    const [showModal, setShowModal] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const empresaId = localStorage.getItem('solutia_empresa_id') || ''

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setUserId(data.user.id)
        })
    }, [])

    useEffect(() => {
        if (empresaId) fetchTramitacoes()
    }, [empresaId])

    const fetchTramitacoes = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('tramitacoes')
                .select(`
                    *,
                    documentos!tramitacoes_documento_id_fkey(titulo),
                    remetente:perfis!tramitacoes_remetente_id_fkey(nome),
                    destinatario:perfis!tramitacoes_destinatario_id_fkey(nome)
                `)
                .eq('empresa_id', empresaId)
                .order('created_at', { ascending: false })

            if (error) throw error

            if (data) {
                setTramitacoes(data.map((t: any) => ({
                    ...t,
                    documento_titulo: t.documentos?.titulo || 'Documento removido',
                    remetente_nome: t.remetente?.nome || 'Desconhecido',
                    destinatario_nome: t.destinatario?.nome || 'Desconhecido',
                })))
            }
        } catch (err) {
            console.error('Erro ao buscar tramitações:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStatus = async (id: string, novoStatus: string) => {
        const { error } = await supabase
            .from('tramitacoes')
            .update({ status: novoStatus, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (!error) fetchTramitacoes()
    }

    const filtradas = tramitacoes.filter(t => {
        if (filtro === 'enviadas') return t.remetente_id === userId
        if (filtro === 'recebidas') return t.destinatario_id === userId
        return true
    })

    const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')
    const isPastDue = (prazo: string | null) => prazo && new Date(prazo) < new Date()

    return (
        <>
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400">
                            <ArrowRightLeft size={16} />
                        </div>
                        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">Tramitações</h3>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">{filtradas.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Filtros */}
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 text-xs">
                            {[
                                { key: 'todas', label: 'Todas', icon: ArrowRightLeft },
                                { key: 'enviadas', label: 'Enviadas', icon: Send },
                                { key: 'recebidas', label: 'Recebidas', icon: Inbox },
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setFiltro(f.key as any)}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${filtro === f.key
                                        ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                        }`}
                                >
                                    <f.icon size={12} />
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                        >
                            <Plus size={14} /> Nova
                        </button>
                    </div>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <Loader2 size={24} className="animate-spin text-green-500" />
                        </div>
                    ) : filtradas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                            <ArrowRightLeft size={32} className="text-gray-300 dark:text-gray-600" />
                            <span className="text-sm font-medium">Nenhuma tramitação encontrada.</span>
                        </div>
                    ) : (
                        filtradas.map(t => {
                            const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG['Pendente']
                            const StatusIcon = cfg.icon
                            const overdue = isPastDue(t.prazo)
                            const isRecebida = t.destinatario_id === userId

                            return (
                                <div key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.border} ${cfg.bg} dark:bg-gray-800 dark:border-gray-700 group hover:shadow-sm transition-all`}>
                                    <div className="mt-0.5 shrink-0">
                                        <StatusIcon size={18} className={cfg.color} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                                                {t.status}
                                            </span>
                                            {overdue && t.status !== 'Concluído' && (
                                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">ATRASADO</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <FileText size={14} className="text-gray-400 shrink-0" />
                                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{t.documento_titulo}</h4>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                            <User size={12} />
                                            <span className="truncate">{t.remetente_nome}</span>
                                            <span className="text-gray-300">→</span>
                                            <span className="truncate font-medium">{t.destinatario_nome}</span>
                                            <span className="text-gray-300 mx-1">•</span>
                                            <span>{formatDate(t.created_at)}</span>
                                            {t.prazo && (
                                                <>
                                                    <span className="text-gray-300 mx-1">•</span>
                                                    <span className={overdue && t.status !== 'Concluído' ? 'text-red-500 font-medium' : ''}>
                                                        Prazo: {formatDate(t.prazo)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {t.observacao && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic truncate">"{t.observacao}"</p>
                                        )}
                                    </div>

                                    {/* Ações rápidas */}
                                    {isRecebida && t.status !== 'Concluído' && (
                                        <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {t.status === 'Pendente' && (
                                                <button onClick={() => handleUpdateStatus(t.id, 'Recebido')} className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-200 transition-colors">
                                                    Receber
                                                </button>
                                            )}
                                            {(t.status === 'Recebido' || t.status === 'Pendente') && (
                                                <button onClick={() => handleUpdateStatus(t.id, 'Em Análise')} className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-lg hover:bg-purple-200 transition-colors">
                                                    Analisar
                                                </button>
                                            )}
                                            {t.status === 'Em Análise' && (
                                                <>
                                                    <button onClick={() => handleUpdateStatus(t.id, 'Concluído')} className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-200 transition-colors">
                                                        Concluir
                                                    </button>
                                                    <button onClick={() => handleUpdateStatus(t.id, 'Devolvido')} className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-200 transition-colors">
                                                        Devolver
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {showModal && (
                <NovaTramitacaoModal
                    empresaId={empresaId}
                    onClose={() => setShowModal(false)}
                    onCreated={() => { setShowModal(false); fetchTramitacoes() }}
                />
            )}
        </>
    )
}
