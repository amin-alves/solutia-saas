import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
    Activity,
    AlertTriangle,
    BarChart2,
    CheckCircle,
    ChevronDown,
    Clock,
    MousePointerClick,
    RefreshCw,
    Users
} from 'lucide-react'

// Email do superadmin da plataforma Solutia SaaS
const SUPERADMIN_EMAIL = 'amin.alves.jr@gmail.com'

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface AnalyticsRow {
    id: string
    anon_session: string
    event: string
    properties: Record<string, string | number | boolean> | null
    error_message: string | null
    component_failed: string | null
    timestamp: string
    created_at: string
}

interface EventCount {
    event: string
    count: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const COUNT_LIMIT = 200

const formatDateBR = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })

const eventLabel: Record<string, string> = {
    app_initialized: 'Sessão Iniciada',
    ui_error: 'Erro de Interface',
    view_dashboard: 'Acessou Dashboard',
    view_documentos: 'Acessou Documentos',
    click_convidar: 'Clicou em Convidar',
}

// ─── Componente Principal ───────────────────────────────────────────────────
export default function Analytics() {
    const navigate = useNavigate()
    const [rows, setRows] = useState<AnalyticsRow[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('todos')
    const [page, setPage] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const [authorized, setAuthorized] = useState<boolean | null>(null)

    // ── Guard de Acesso: verifica se é o superadmin ────────────────────────
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const email = session?.user?.email ?? ''
            if (email !== SUPERADMIN_EMAIL) {
                navigate('/dashboard', { replace: true })
            } else {
                setAuthorized(true)
            }
        })
    }, [navigate])

    const fetchData = async () => {
        setRefreshing(true)
        const query = supabase
            .from('system_analytics')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(COUNT_LIMIT)

        if (filter !== 'todos') query.eq('event', filter)

        const { data, error } = await query
        if (!error && data) setRows(data as AnalyticsRow[])
        setLoading(false)
        setRefreshing(false)
        setPage(0)
    }

    useEffect(() => { if (authorized) fetchData() }, [filter, authorized])



    // ── Métricas ──────────────────────────────────────────────────────────
    const totalEventos = rows.length
    const sessoesUnicas = new Set(rows.map(r => r.anon_session)).size
    const erros = rows.filter(r => r.event === 'ui_error').length
    const eventCounts: EventCount[] = Object.entries(
        rows.reduce((acc: Record<string, number>, r) => {
            acc[r.event] = (acc[r.event] || 0) + 1
            return acc
        }, {})
    )
        .map(([event, count]) => ({ event, count }))
        .sort((a, b) => b.count - a.count)

    const uniqEvents = ['todos', ...Array.from(new Set(rows.map(r => r.event)))]

    // ── Paginação ──────────────────────────────────────────────────────────
    const PAGE_SIZE = 20
    const start = page * PAGE_SIZE
    const paginated = rows.slice(start, start + PAGE_SIZE)
    const totalPages = Math.ceil(rows.length / PAGE_SIZE)

    // ── Render ─────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center h-full min-h-[50vh]">
            <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-600">
                <Activity className="animate-pulse" size={40} />
                <p className="text-sm">Carregando dados de analytics...</p>
            </div>
        </div>
    )

    return (
        <div className="space-y-8 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart2 className="text-indigo-600 dark:text-indigo-400" size={28} />
                        Painel de Analytics
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Dados anônimos de uso — em conformidade com a LGPD. Nenhum dado pessoal é coletado.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all disabled:opacity-50"
                >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            {/* Cards de métricas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={<Activity size={22} className="text-indigo-500" />}
                    label="Total de Eventos"
                    value={totalEventos}
                    bg="bg-indigo-50 dark:bg-indigo-900/20"
                />
                <MetricCard
                    icon={<Users size={22} className="text-emerald-500" />}
                    label="Sessões Únicas"
                    value={sessoesUnicas}
                    bg="bg-emerald-50 dark:bg-emerald-900/20"
                />
                <MetricCard
                    icon={<MousePointerClick size={22} className="text-violet-500" />}
                    label="Tipos de Evento"
                    value={eventCounts.length}
                    bg="bg-violet-50 dark:bg-violet-900/20"
                />
                <MetricCard
                    icon={<AlertTriangle size={22} className="text-rose-500" />}
                    label="Erros Capturados"
                    value={erros}
                    bg="bg-rose-50 dark:bg-rose-900/20"
                />
            </div>

            {/* Top Eventos */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <CheckCircle size={18} className="text-indigo-500" />
                        Top Eventos
                    </h2>
                </div>
                <div className="p-5 space-y-3">
                    {eventCounts.slice(0, 6).map(({ event, count }) => {
                        const pct = Math.round((count / totalEventos) * 100) || 0
                        return (
                            <div key={event}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                                        {eventLabel[event] || event}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                                        {count} <span className="text-xs">({pct}%)</span>
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                    {eventCounts.length === 0 && (
                        <p className="text-center text-sm text-gray-400 py-4">Nenhum evento registrado ainda.</p>
                    )}
                </div>
            </div>

            {/* Tabela de Eventos */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
                    <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock size={18} className="text-indigo-500" />
                        Histórico de Eventos <span className="text-xs font-normal text-gray-400">(últimos {COUNT_LIMIT})</span>
                    </h2>
                    {/* Filtro de evento */}
                    <div className="relative">
                        <select
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="appearance-none pr-8 pl-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                        >
                            {uniqEvents.map(ev => (
                                <option key={ev} value={ev}>
                                    {ev === 'todos' ? 'Todos os Eventos' : (eventLabel[ev] || ev)}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[640px]">
                        <thead className="bg-gray-50/60 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                {['Sessão Anônima', 'Evento', 'Propriedades / Erro', 'Data/Hora'].map(h => (
                                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                                        Nenhum evento encontrado para este filtro.
                                    </td>
                                </tr>
                            ) : paginated.map(row => (
                                <tr key={row.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors text-sm">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                                        {row.anon_session}
                                    </td>
                                    <td className="px-4 py-3">
                                        <EventBadge event={row.event} />
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                                        {row.event === 'ui_error' && row.error_message ? (
                                            <span className="text-rose-600 dark:text-rose-400 font-medium">
                                                [{row.component_failed}] {row.error_message}
                                            </span>
                                        ) : row.properties ? (
                                            <span className="truncate block max-w-[260px]" title={JSON.stringify(row.properties)}>
                                                {Object.entries(row.properties)
                                                    .filter(([, v]) => v !== '' && v !== null)
                                                    .slice(0, 3)
                                                    .map(([k, v]) => `${k}: ${v}`)
                                                    .join(' · ')}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {formatDateBR(row.timestamp)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
                        <span>Página {page + 1} de {totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 0}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-all"
                            >Anterior</button>
                            <button
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-all"
                            >Próxima</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, bg }: {
    icon: React.ReactNode; label: string; value: number; bg: string
}) {
    return (
        <div className={`${bg} rounded-2xl p-5 border border-gray-100 dark:border-gray-800 flex items-center gap-4`}>
            <div className="p-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm shrink-0">
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
            </div>
        </div>
    )
}

const eventColors: Record<string, string> = {
    app_initialized: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    ui_error: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    view_dashboard: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    view_documentos: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
    click_convidar: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
}

function EventBadge({ event }: { event: string }) {
    const color = eventColors[event] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    return (
        <span className={`${color} px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider`}>
            {eventLabel[event] || event}
        </span>
    )
}
