"use client"

import { useState } from "react"

export default function UsuariosPage() {
  const [busca, setBusca] = useState("")

  const usuarios = [
    {
      id: 1,
      nome: "Amin Alves",
      email: "amin@ami.com",
      role: "Administrador",
      status: "Ativo",
    },
    {
      id: 2,
      nome: "Amin Alves Ager",
      email: "amin@ager.com",
      role: "Administrador",
      status: "Ativo",
    },
    {
      id: 3,
      nome: "Amin Alves Pox",
      email: "amin@pox.com",
      role: "Administrador",
      status: "Ativo",
    },
  ]

  const usuariosFiltrados = usuarios.filter((usuario) =>
    usuario.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Usuários</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Novo Usuário
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar usuário..."
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
              <th className="p-3">Email</th>
              <th className="p-3">Perfil</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((usuario) => (
              <tr
                key={usuario.id}
                className="border-t hover:bg-gray-50 transition"
              >
                <td className="p-3">{usuario.nome}</td>
                <td className="p-3">{usuario.email}</td>
                <td className="p-3">{usuario.role}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-sm ${
                      usuario.status === "Ativo"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {usuario.status}
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