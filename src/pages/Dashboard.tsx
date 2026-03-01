import { useEffect, useState } from "react"
import FolderTree from "../components/dashboard/FolderTree"
import BiMetrics from "../components/dashboard/BiMetrics"
import WorkflowBoard from "../components/dashboard/WorkflowBoard"

export default function Dashboard() {
    const [empresa, setEmpresa] = useState<string | null>(null)

    useEffect(() => {
        setEmpresa(localStorage.getItem("solutia_empresa_nome"))
    }, [])

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Painel de Controle</h1>
                    <p className="text-slate-500 font-medium">
                        Ambiente: <span className="text-indigo-600 font-bold">{empresa || "Carregando..."}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.href = '/documentos'}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Documentos
                    </button>
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                        + Nova Ação
                    </button>
                </div>
            </div>

            {/* Layout Grid Flexível do Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-6 flex-1 min-h-0">

                {/* 1. Árvore de Pastas (Esquerda - 3 colunas) */}
                <div className="md:col-span-1 lg:col-span-3 h-full min-h-[400px]">
                    <FolderTree />
                </div>

                {/* 2. Área de BI / KPIs (Centro - 6 colunas) */}
                <div className="md:col-span-3 lg:col-span-6 h-full min-h-[400px]">
                    <BiMetrics />
                </div>

                {/* 3. Área de Workflow (Direita - 3 colunas) */}
                <div className="md:col-span-4 lg:col-span-3 h-full min-h-[400px]">
                    <WorkflowBoard />
                </div>

            </div>
        </div>
    )
}
