import { useEffect, useState } from "react"

export default function Dashboard() {
    const [empresa, setEmpresa] = useState<string | null>(null)

    useEffect(() => {
        setEmpresa(localStorage.getItem("solutia_empresa_nome"))
    }, [])

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-700">Bem-vindo(a) ao sistema!</h2>
                <p className="mt-2 text-gray-600 font-medium">
                    Contexto atual: <span className="text-blue-600">{empresa || "Carregando..."}</span>
                </p>
                <p className="mt-4 text-gray-500 text-sm">
                    Aqui você poderá visualizar os indicadores principais e atalhos rápidos pertinentes a esta organização.
                </p>
            </div>
        </div>
    )
}
