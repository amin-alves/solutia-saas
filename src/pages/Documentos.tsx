import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

interface Documento {
    id: string;
    titulo: string;
    pasta: string;
    tamanho: string;
    data: string;
    empresa_id: string;
}

export default function DocumentosPage() {
    const [busca, setBusca] = useState("")
    const [documentos, setDocumentos] = useState<Documento[]>([])

    // Ao montar a página, carrega apenas os documentos da empresa logada
    useEffect(() => {
        async function fetchDocumentos() {
            const empresaId = localStorage.getItem("solutia_empresa_id")

            if (!empresaId) {
                setDocumentos([])
                return
            }

            // Carrega os documentos reais do banco mapeados à mesma empresa
            const { data, error } = await supabase
                .from("documentos")
                .select("*")
                .eq("empresa_id", empresaId)

            if (!error && data) {
                setDocumentos(data as Documento[])
            } else {
                console.error("Erro ao carregar documentos:", error)
            }
        }

        fetchDocumentos()
    }, [])

    const documentosFiltrados = documentos.filter((doc) =>
        doc.titulo?.toLowerCase().includes(busca.toLowerCase()) || doc.pasta?.toLowerCase().includes(busca.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Armazém de Documentos</h1>
                    <p className="text-gray-500 mt-1">Gerencie os arquivos da sua organização com segurança.</p>
                </div>
                <button className="mt-4 md:mt-0 bg-indigo-600 shadow-lg shadow-indigo-600/30 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 hover:-translate-y-0.5 transition-all">
                    + Enviar Arquivo
                </button>
            </div>

            <div className="relative max-w-md">
                <input
                    type="text"
                    placeholder="Buscar por título ou pasta..."
                    className="w-full pl-4 pr-10 py-3 border border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl shadow-sm outline-none transition-all"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 text-sm font-semibold text-gray-600">Documento</th>
                                <th className="p-4 text-sm font-semibold text-gray-600">Pasta / Categoria</th>
                                <th className="p-4 text-sm font-semibold text-gray-600">Tamanho</th>
                                <th className="p-4 text-sm font-semibold text-gray-600 text-right">Data de Envio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {documentosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        Nenhum documento encontrado na sua empresa.
                                    </td>
                                </tr>
                            ) : null}

                            {documentosFiltrados.map((doc) => (
                                <tr
                                    key={doc.id}
                                    className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                                📄
                                            </div>
                                            <span className="font-medium text-gray-900 group-hover:text-indigo-700 transition-colors">{doc.titulo}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600">{doc.pasta}</td>
                                    <td className="p-4 text-gray-500 text-sm">{doc.tamanho}</td>
                                    <td className="p-4 text-gray-500 text-sm font-medium text-right">{doc.data}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
