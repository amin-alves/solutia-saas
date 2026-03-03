import { useState, useRef, useCallback } from "react"
import FolderTree from "../components/dashboard/FolderTree"
import BiMetrics from "../components/dashboard/BiMetrics"
import WorkflowBoard from "../components/dashboard/WorkflowBoard"
import { PanelRight, X } from "lucide-react"

export default function Dashboard() {
    // Largura do painel esquerdo em %
    const [leftWidth, setLeftWidth] = useState(25)
    // Painel direito (Workflow) toggle
    const [showPanel, setShowPanel] = useState(false)
    const [panelWidth, setPanelWidth] = useState(28)

    const containerRef = useRef<HTMLDivElement>(null)
    const draggingRef = useRef<'left' | 'right' | null>(null)

    const handleMouseDown = useCallback((divider: 'left' | 'right') => {
        draggingRef.current = divider
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current || !draggingRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const pct = ((e.clientX - rect.left) / rect.width) * 100

            if (draggingRef.current === 'left') {
                setLeftWidth(Math.min(Math.max(pct, 12), 45))
            } else {
                setPanelWidth(Math.min(Math.max(100 - pct, 15), 50))
            }
        }

        const handleMouseUp = () => {
            draggingRef.current = null
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }, [])

    const centerWidth = showPanel ? 100 - leftWidth - panelWidth : 100 - leftWidth

    return (
        <div ref={containerRef} className="h-[calc(100vh-7rem)] flex relative">

            {/* ═══ Painel Esquerdo: Árvore de Pastas ═══ */}
            <div className="h-full overflow-hidden flex flex-col" style={{ width: `${leftWidth}%` }}>
                <div className="flex-1 overflow-auto rounded-xl">
                    <FolderTree />
                </div>
            </div>

            {/* Divider Esquerdo */}
            <div
                className="w-1.5 h-full cursor-col-resize group flex items-center justify-center shrink-0 hover:bg-indigo-100 transition-colors"
                onMouseDown={() => handleMouseDown('left')}
            >
                <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-indigo-500 rounded-full transition-colors" />
            </div>

            {/* ═══ Painel Central: Métricas BI ═══ */}
            <div className="h-full overflow-hidden flex flex-col" style={{ width: `${centerWidth}%` }}>
                <div className="flex-1 overflow-auto rounded-xl">
                    <BiMetrics />
                </div>
            </div>

            {/* ═══ Painel Direito Togglável: Workflow ═══ */}
            {showPanel && (
                <>
                    {/* Divider Direito */}
                    <div
                        className="w-1.5 h-full cursor-col-resize group flex items-center justify-center shrink-0 hover:bg-indigo-100 transition-colors"
                        onMouseDown={() => handleMouseDown('right')}
                    >
                        <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-indigo-500 rounded-full transition-colors" />
                    </div>

                    <div className="h-full overflow-hidden flex flex-col" style={{ width: `${panelWidth}%` }}>
                        <div className="flex-1 overflow-auto rounded-xl relative">
                            {/* Botão fechar dentro do painel */}
                            <button
                                onClick={() => setShowPanel(false)}
                                className="absolute top-3 right-3 z-10 p-1 rounded-lg bg-white/80 hover:bg-gray-100 text-gray-400 hover:text-gray-600 shadow-sm border border-gray-200 transition-colors"
                                title="Fechar painel"
                            >
                                <X size={14} />
                            </button>
                            <WorkflowBoard />
                        </div>
                    </div>
                </>
            )}

            {/* ═══ Toggle Tab (aba lateral fixa) ═══ */}
            {!showPanel && (
                <button
                    onClick={() => setShowPanel(true)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-indigo-600 hover:bg-indigo-700 text-white px-1.5 py-4 rounded-l-lg shadow-lg flex flex-col items-center gap-1 transition-colors group"
                    title="Abrir Workflow"
                >
                    <PanelRight size={16} />
                    <span className="text-[9px] font-bold tracking-wide writing-vertical" style={{ writingMode: 'vertical-rl' }}>
                        WORKFLOW
                    </span>
                </button>
            )}
        </div>
    )
}
