import { useEffect, useState } from "react"
import { Clock, MoreHorizontal, CheckCircle2, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Workflow {
    id: string
    titulo: string
    status: string
    created_at: string
    perfil_nome: string
}

export default function WorkflowBoard() {
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchWorkflows()
    }, [])

    const fetchWorkflows = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('workflows')
                .select(`
                    id,
                    titulo,
                    status,
                    created_at,
                    perfis!workflows_criado_por_fkey (nome)
                `)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            if (error) throw error

            if (data) {
                const formattedWorkflows = data.map(wf => ({
                    id: wf.id,
                    titulo: wf.titulo,
                    status: wf.status,
                    created_at: new Date(wf.created_at).toLocaleDateString("pt-BR"),
                    perfil_nome: (wf.perfis as any)?.nome || 'Usuário Desconhecido'
                }))
                setWorkflows(formattedWorkflows)
            }
        } catch (error) {
            console.error("Erro ao buscar workflows:", error)
        } finally {
            setLoading(false)
        }
    }

    // Função utilitária para pegar cor baseada no status
    const getStatusColor = (status: string) => {
        const s = status.toLowerCase()
        if (s.includes("concluído") || s.includes("aprovado")) return 'emerald'
        if (s.includes("análise") || s.includes("pendente")) return 'amber'
        if (s.includes("devolvido") || s.includes("cancelado")) return 'rose'
        return 'blue'
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
            {/* Header Workflow */}
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600">
                        <Clock size={16} strokeWidth={2.5} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">Tramitação (Workflow)</h3>
                </div>
                <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                    Ver todos
                </button>
            </div>

            {/* Lista Vertical de Processos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <Loader2 size={24} className="animate-spin text-indigo-500" />
                        <span className="text-sm font-medium">Carregando processos...</span>
                    </div>
                ) : workflows.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 p-4 text-center">
                        <CheckCircle2 size={32} className="text-slate-300" />
                        <span className="text-sm font-medium">Nenhum processo em andamento.</span>
                    </div>
                ) : (
                    workflows.map((wf) => {
                        const colorClass = getStatusColor(wf.status)
                        const statusColors: Record<string, string> = {
                            amber: "bg-amber-100 text-amber-700 border-amber-200",
                            rose: "bg-rose-100 text-rose-700 border-rose-200",
                            emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
                            blue: "bg-blue-100 text-blue-700 border-blue-200"
                        }

                        const isDone = colorClass === 'emerald'

                        return (
                            <div key={wf.id} className={`flex items-start gap-4 p-3 rounded-xl border ${isDone ? 'bg-slate-50/50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'} group hover:border-indigo-200 transition-colors`}>

                                {/* Icone de Status */}
                                <div className="mt-0.5 shrink-0">
                                    {isDone ? (
                                        <CheckCircle2 size={18} className="text-emerald-500" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
                                    )}
                                </div>

                                {/* Conteúdo Principal */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider tooltip" title={wf.id}>
                                                {wf.id.substring(0, 8)}...
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[colorClass]}`}>
                                                {wf.status}
                                            </span>
                                        </div>
                                    </div>
                                    <h4 className={`text-sm font-bold truncate mb-1.5 ${isDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                        {wf.titulo}
                                    </h4>

                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                                            {wf.perfil_nome.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-xs text-slate-500 truncate">{wf.perfil_nome}</span>
                                        <span className="text-xs text-slate-300 mx-1 shrink-0">•</span>
                                        <span className="text-[10px] text-slate-400 font-medium shrink-0">{wf.created_at}</span>
                                    </div>
                                </div>

                                {/* Actions / Menu */}
                                <button className="text-slate-400 hover:text-indigo-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal size={16} />
                                </button>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Floating Action Button pra Criar Workflow */}
            <div className="p-4 border-t border-slate-100 bg-white">
                <button className="w-full bg-slate-800 hover:bg-black text-white py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-md">
                    <span>+ Novo Processo</span>
                </button>
            </div>
        </div>
    )
}
