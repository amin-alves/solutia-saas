"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <h1 className="text-3xl font-bold">Solutia</h1>
        <nav>
          <button
            className="mr-4 bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100 transition"
            onClick={() => router.push("/login")}
          >
            Login
          </button>
          <button
            className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100 transition"
            onClick={() => router.push("/signup")}
          >
            Cadastre-se
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col md:flex-row items-center justify-center px-6 md:px-20 py-10">
        <div className="max-w-xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Gestão Integrada para Órgãos e Empresas
          </h2>
          <p className="mb-6 text-lg md:text-xl">
            Controle, organize e otimize processos de forma simples, segura e moderna.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              className="bg-white text-blue-600 px-6 py-3 rounded font-semibold hover:bg-gray-100 transition"
              onClick={() => router.push("/signup")}
            >
              Começar
            </button>
            <button
              className="bg-transparent border border-white px-6 py-3 rounded font-semibold hover:bg-white hover:text-blue-600 transition"
              onClick={() => router.push("/login")}
            >
              Entrar
            </button>
          </div>
        </div>

        {/* Imagem ilustrativa */}
        <div className="hidden md:block ml-10">
          <img
            src="/hero-illustration.png"
            alt="Ilustração Solutia"
            className="w-96"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 bg-blue-700 mt-auto">
        © 2026 Solutia. Todos os direitos reservados.
      </footer>
    </div>
  );
}
