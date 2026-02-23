'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const params = useParams()
  const slug = params.slug || ''
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [filesList, setFilesList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Captura arquivo do input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) setFile(e.target.files[0])
  }

  // Upload de arquivo
  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    const { data, error } = await supabase
      .storage
      .from('documents')
      .upload(`${slug}/${file.name}`, file, { upsert: true })

    if (error) setMessage(`Erro ao enviar: ${error.message}`)
    else {
      setMessage(`Arquivo enviado com sucesso: ${data.path}`)
      fetchFiles()
    }
    setLoading(false)
  }

  // Listar arquivos da empresa
  const fetchFiles = async () => {
    setLoading(true)
    const { data, error } = await supabase.storage.from('documents').list(`${slug}/`)
    if (error) setMessage(`Erro ao listar arquivos: ${error.message}`)
    else setFilesList(data)
    setLoading(false)
  }

  // Download de arquivo
  const handleDownload = async (filePath: string) => {
    const { data, error } = await supabase.storage.from('documents').download(filePath)
    if (error) return alert(`Erro ao baixar: ${error.message}`)
    const url = window.URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = filePath.split('/').pop() || 'arquivo'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  useEffect(() => { fetchFiles() }, [slug])

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard - {slug}</h1>

      <div style={{ marginBottom: 20 }}>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={loading || !file} style={{ marginLeft: 10 }}>
          {loading ? 'Enviando...' : 'Enviar arquivo'}
        </button>
      </div>

      {message && <p>{message}</p>}

      <h2>Arquivos da empresa:</h2>
      {loading && <p>Carregando arquivos...</p>}
      <ul>
        {filesList.map(f => (
          <li key={f.name}>
            {f.name}{' '}
            <button onClick={() => handleDownload(`${slug}/${f.name}`)}>Baixar</button>
          </li>
        ))}
      </ul>
    </div>
  )
}