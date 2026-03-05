import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { X, Send, FileText, User, Calendar, MessageSquare, Loader2 } from "lucide-react"

interface Props {
    empresaId: string
    onClose: () => void
    onCreated: () => void
}

interface Documento {
    id: string
    titulo: string
    extensao: string | null
}

interface Membro {
    id: string
    nome: string
}

export default function NovaTramitacaoModal({ empresaId, onClose, onCreated }: Props) {
    const [documentos, setDocumentos] = useState<Documento[]>([])
    const [membros, setMembros] = useState<Membro[]>([])
    const [selectedDoc, setSelectedDoc] = useState("")
    const [selectedDest, setSelectedDest] = useState("")
    const [observacao, setObservacao] = useState("")
    const [prazo, setPrazo] = useState("")
    const [loading, setLoading] = useState(false)
    const [loadingData, setLoadingData] = useState(true)

    useEffect(() => {
        async function loadData() {
            setLoadingData(true)
            const [docsRes, membrosRes] = await Promise.all([
                supabase.from('documentos').select('id, titulo, extensao').eq('empresa_id', empresaId).is('deleted_at', null).order('titulo'),
                supabase.from('perfis').select('id, nome').eq('empresa_id', empresaId).order('nome'),
            ])

            if (docsRes.data) setDocumentos(docsRes.data)
            if (membrosRes.data) setMembros(membrosRes.data)
            setLoadingData(false)
        }
        loadData()
    }, [empresaId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDoc || !selectedDest) return

        setLoading(true)
        try {
            const user = (await supabase.auth.getUser()).data.user
            if (!user) throw new Error('Usuário não autenticado')

            const { error } = await supabase.from('tramitacoes').insert({
                empresa_id: empresaId,
                documento_id: selectedDoc,
                remetente_id: user.id,
                destinatario_id: selectedDest,
                status: 'Pendente',
                observacao: observacao.trim() || null,
                prazo: prazo || null,
            })

            if (error) throw error
            onCreated()
        } catch (err: any) {
            console.error('Erro ao criar tramitação:', err)
            alert('Erro ao criar tramitação: ' + (err.message || 'Erro desconhecido'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Send size={20} className="text-green-600" /> Nova Tramitação
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                {loadingData ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-green-500" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Documento */}
                        <div>
                            <label className="block text-[11px] font-bold text-green-700 dark:text-green-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                <FileText size={12} /> Documento
                            </label>
                            <select
                                required
                                value={selectedDoc}
                                onChange={e => setSelectedDoc(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:border-green-400 focus:ring-2 focus:ring-green-500/10 outline-none transition-all text-gray-900 dark:text-gray-100"
                            >
                                <option value="">Selecione um documento...</option>
                                {documentos.map(d => (
                                    <option key={d.id} value={d.id}>{d.titulo}{d.extensao ? `.${d.extensao}` : ''}</option>
                                ))}
                            </select>
                        </div>

                        {/* Destinatário */}
                        <div>
                            <label className="block text-[11px] font-bold text-green-700 dark:text-green-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                <User size={12} /> Destinatário
                            </label>
                            <select
                                required
                                value={selectedDest}
                                onChange={e => setSelectedDest(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:border-green-400 focus:ring-2 focus:ring-green-500/10 outline-none transition-all text-gray-900 dark:text-gray-100"
                            >
                                <option value="">Selecione um membro...</option>
                                {membros.map(m => (
                                    <option key={m.id} value={m.id}>{m.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Observação */}
                        <div>
                            <label className="block text-[11px] font-bold text-green-700 dark:text-green-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                <MessageSquare size={12} /> Observação / Despacho
                            </label>
                            <textarea
                                value={observacao}
                                onChange={e => setObservacao(e.target.value)}
                                placeholder="Ex: Favor analisar e dar parecer até sexta-feira..."
                                rows={3}
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:border-green-400 focus:ring-2 focus:ring-green-500/10 outline-none transition-all text-gray-900 dark:text-gray-100 resize-none placeholder-gray-400"
                            />
                        </div>

                        {/* Prazo */}
                        <div>
                            <label className="block text-[11px] font-bold text-green-700 dark:text-green-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                <Calendar size={12} /> Prazo (opcional)
                            </label>
                            <input
                                type="date"
                                value={prazo}
                                onChange={e => setPrazo(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:border-green-400 focus:ring-2 focus:ring-green-500/10 outline-none transition-all text-gray-900 dark:text-gray-100"
                            />
                        </div>

                        {/* Botão Enviar */}
                        <button
                            type="submit"
                            disabled={loading || !selectedDoc || !selectedDest}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            {loading ? 'Enviando...' : 'Tramitar Documento'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
