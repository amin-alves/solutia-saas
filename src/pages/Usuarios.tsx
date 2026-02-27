import { useState, useEffect } from "react"
import { getUsuariosPorEmpresa, Usuario } from "../lib/mockDb"

export default function UsuariosPage() {
    const [busca, setBusca] = useState("")
    const [usuarios, setUsuarios] = useState<Usuario[]>([])

    // Ao montar a página, carrega apenas os usuários da empresa logada
    useEffect(() => {
        const empresaId = localStorage.getItem("solutia_empresa_id")
        setUsuarios(getUsuariosPorEmpresa(empresaId))
    }, [])

    const usuariosFiltrados = usuarios.filter((usuario) =>
        usuario.nome.toLowerCase().includes(busca.toLowerCase()) || usuario.email.toLowerCase().includes(busca.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gestão de Equipe</h1>
                    <p className="text-gray-500 mt-1">Controle os acessos e permissões dos membros.</p>
                </div>
                <button className="mt-4 md:mt-0 bg-blue-600 shadow-lg shadow-blue-600/30 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 hover:-translate-y-0.5 transition-all">
                    + Convidar Membro
                </button>
            </div>

            <div className="relative max-w-md">
                <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    className="w-full pl-4 pr-10 py-3 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl shadow-sm outline-none transition-all"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 text-sm font-semibold text-gray-600">Usuário</th>
                                <th className="p-4 text-sm font-semibold text-gray-600">Email</th>
                                <th className="p-4 text-sm font-semibold text-gray-600">Papel</th>
                                <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                                <th className="p-4 text-sm font-semibold text-gray-600 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {usuariosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            ) : null}

                            {usuariosFiltrados.map((usuario) => (
                                <tr
                                    key={usuario.id}
                                    className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                                {usuario.nome.charAt(0)}
                                            </div>
                                            <span className="font-medium text-gray-900">{usuario.nome}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600">{usuario.email}</td>
                                    <td className="p-4">
                                        <span className="text-gray-700 bg-gray-100 px-3 py-1 rounded-md text-sm font-medium">
                                            {usuario.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${usuario.status === "Ativo"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-rose-100 text-rose-800"
                                                }`}
                                        >
                                            {usuario.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">Editar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
