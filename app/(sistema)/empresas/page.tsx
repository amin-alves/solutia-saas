"use client"

import { useState } from "react"

export default function EmpresasPage() {
  const [busca, setBusca] = useState("")

  const empresas = [
    {
      id: 1,
      nome: "A.M.I. Engenharia",
      cnpj: "01.878.883/0001-08",
      status: "Ativa",
    },
    {
      id: 2,
      nome: "AGERSINOP",
      cnpj: "21.403.080/0001-04",
      status: "Ativa",
    },
    {
      id: 3,
      nome: "Prefeitura de Poxoréu",
      cnpj: "03.408.911/0001-40",
      status: "Inativa",
    },
  ]

  const empresasFiltradas = empresas.filter((empresa) =>
    empresa.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Empresas</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Nova Empresa
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar empresa..."
          className="w-full md:w-1/3 p-2 border rounded-lg"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">CNPJ</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {empresasFiltradas.map((empresa) => (
              <tr
                key={empresa.id}
                className="border-t hover:bg-gray-50 transition"
              >
                <td className="p-3">{empresa.nome}</td>
                <td className="p-3">{empresa.cnpj}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-sm ${
                      empresa.status === "Ativa"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {empresa.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}