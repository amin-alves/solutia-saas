"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"

export default function SistemaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<string | null>(null)

  useEffect(() => {
    const auth = localStorage.getItem("solutia_auth")
    const email = localStorage.getItem("solutia_user")

    if (!auth) {
      router.push("/")
    } else {
      setUser(email)
    }
  }, [])

  function logout() {
    localStorage.removeItem("solutia_auth")
    localStorage.removeItem("solutia_user")
    router.push("/")
  }

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen bg-gray-100">
        
        {/* HEADER */}
        <header className="bg-white shadow px-8 py-4 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-700">
            Sistema de Gestão
          </h1>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">
                {user}
              </p>
              <p className="text-xs text-gray-500">
                Usuário logado
              </p>
            </div>

            <button
              onClick={logout}
              className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600"
            >
              Sair
            </button>
          </div>
        </header>

        {/* CONTEÚDO */}
        <main className="flex-1 p-8">
          {children}
        </main>

      </div>
    </div>
  )
}