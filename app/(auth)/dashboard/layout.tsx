'use client'

import { useEffect, useState } from 'react'


type Document = {
  id: string
  name: string
  path: string
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchDocuments() {
      // Ler company_id do cookie
      const company_id = document.cookie
        .split('; ')
        .find(row => row.startsWith('company_id='))
        ?.split('=')[1]

      if (!company_id) return

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', company_id)

      if (error) {
        console.error('Erro ao buscar documentos:', error)
      } else {
        setDocuments(data || [])
      }
    }

    fetchDocuments()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {documents.length === 0 ? (
        <p>Nenhum documento encontrado para esta empresa.</p>
      ) : (
        <ul className="list-disc pl-5">
          {documents.map(doc => (
            <li key={doc.id}>
              {doc.name} - <a href={doc.path} target="_blank">Abrir</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}