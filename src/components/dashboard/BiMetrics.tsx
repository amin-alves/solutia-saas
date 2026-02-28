import { ArrowUpRight, ArrowDownRight, Users, FileCheck, Clock, CheckCircle } from "lucide-react"

const METRICS = [
    {
        title: "Processos Ativos",
        value: "142",
        change: "+12%",
        isPositive: true,
        icon: Clock,
        color: "blue"
    },
    {
        title: "Documentos",
        value: "8.4k",
        change: "+4%",
        isPositive: true,
        icon: FileCheck,
        color: "indigo"
    },
    {
        title: "Usuários",
        value: "34",
        change: "-2",
        isPositive: false,
        icon: Users,
        color: "rose"
    },
    {
        title: "Concluídos (Mês)",
        value: "89%",
        change: "+2.4%",
        isPositive: true,
        icon: CheckCircle,
        color: "emerald"
    }
]

export default function BiMetrics() {
    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header / Titulo BI */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Visão Geral</h2>
                    <p className="text-sm text-slate-500">Métricas e acompanhamento em tempo real</p>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm flex gap-2">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Online</span>
                </div>
            </div>

            {/* Cards de KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {METRICS.map((metric, idx) => {
                    const Icon = metric.icon
                    const colorMap: Record<string, string> = {
                        blue: "bg-blue-100 text-blue-600",
                        indigo: "bg-indigo-100 text-indigo-600",
                        emerald: "bg-emerald-100 text-emerald-600",
                        rose: "bg-rose-100 text-rose-600"
                    }

                    return (
                        <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">

                            {/* Brilho decorativo ao passar o mouse */}
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2.5 rounded-xl ${colorMap[metric.color]}`}>
                                        <Icon size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${metric.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {metric.isPositive ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
                                        {metric.change}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">{metric.value}</h3>
                                    <p className="text-sm font-medium text-slate-500 mt-1">{metric.title}</p>
                                </div>
                            </div>

                        </div>
                    )
                })}
            </div>

            {/* Gráfico Fake / Evolução temporal */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 min-h-[200px] flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-6 z-10">
                    <h3 className="font-bold text-slate-800">Tráfego de Documentos</h3>
                    <select className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-600 font-medium outline-none">
                        <option>Últimos 7 dias</option>
                        <option>Este mês</option>
                    </select>
                </div>

                {/* Gráfico de Barras Decorativo 100% CSS */}
                <div className="flex-1 flex items-end justify-between gap-2 z-10 pt-4">
                    {[40, 70, 45, 90, 65, 85, 100].map((height, i) => (
                        <div key={i} className="w-full flex flex-col items-center gap-2 group cursor-pointer">
                            <div className="w-full bg-slate-100 rounded-t-sm h-full flex items-end overflow-hidden">
                                <div
                                    className="w-full bg-blue-500 rounded-t-sm transition-all duration-500 group-hover:bg-indigo-600 relative"
                                    style={{ height: `${height}%` }}
                                >
                                    {/* Tooltip Hover */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        {height}
                                    </div>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'][i]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
