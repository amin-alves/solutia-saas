"use client"

import { useState } from "react"

export default function DocumentosPage() {
  const [busca, setBusca] = useState("")

  const documentos = [
    {
      id: 1,
      titulo: "Contrato Saneamento 2024",
      pasta: "Contratos",
      tamanho: "2.3 MB",
      data: "10/02/2026",
    },
    {
      id: 2,
      titulo: "Licença Ambiental",
      pasta: "Licenças",
      tamanho: "1.1 MB",
      data: "05/02/2026",
    },
    {
      id: 3,
      titulo: "Relatório de Fiscalização",
      pasta: "Relatórios",
      tamanho: "3.8 MB",
      data: "01/02/2026",
    },
  ]

  const documentosFiltrados = documentos.filter((doc) =>
    doc.titulo.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Documentos</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Novo Documento
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar documento..."
          className="w-full md:w-1/3 p-2 border rounded-lg"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Título</th>
              <th className="p-3">Pasta</th>
              <th className="p-3">Tamanho</th>
              <th className="p-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {documentosFiltrados.map((doc) => (
              <tr
                key={doc.id}
                className="border-t hover:bg-gray-50 transition"
              >
                <td className="p-3">{doc.titulo}</td>
                <td className="p-3">{doc.pasta}</td>
                <td className="p-3">{doc.tamanho}</td>
                <td className="p-3">{doc.data}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}