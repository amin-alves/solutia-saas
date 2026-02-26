"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()

  function logout() {
    localStorage.removeItem("solutia_auth")
    localStorage.removeItem("solutia_user")
    router.push("/")
  }

  const linkClass = (path: string) =>
    `block px-3 py-2 rounded-lg ${
      pathname === path
        ? "bg-blue-700"
        : "hover:bg-blue-800"
    }`

  return (
    <div className="w-64 bg-blue-900 text-white min-h-screen p-6 space-y-6">
      <h2 className="text-xl font-bold">Solutia</h2>

      <nav className="space-y-2">
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          Dashboard
        </Link>
        <Link href="/documentos" className={linkClass("/documentos")}>
          Documentos
        </Link>
        <Link href="/empresas" className={linkClass("/empresas")}>
          Empresas
        </Link>
        <Link href="/usuarios" className={linkClass("/usuarios")}>
          Usuários
        </Link>
      </nav>

      <button
        onClick={logout}
        className="mt-10 bg-red-500 px-3 py-2 rounded-lg hover:bg-red-600"
      >
        Sair
      </button>
    </div>
  )
}