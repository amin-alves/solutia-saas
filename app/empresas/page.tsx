"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"

export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    const auth = localStorage.getItem("solutia_auth")
    if (!auth) router.push("/")
  }, [])

  return (
    <div className="flex">
      <Sidebar />
      <div className="p-8 flex-1 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow">
            <h2>Documentos</h2>
            <p className="text-3xl font-bold text-blue-600">124</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h2>Empresas</h2>
            <p className="text-3xl font-bold text-blue-600">3</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h2>Usuários</h2>
            <p className="text-3xl font-bold text-blue-600">8</p>
          </div>
        </div>
      </div>
    </div>
  )
}