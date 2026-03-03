import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerLicense } from '@syncfusion/ej2-base'

// Registre sua licença do Syncfusion aqui para remover a marca d'água vermelha.
// Cole sua chave entre as aspas:
registerLicense('Ngo9BigBOggjHTQxAR8/V1JGaF1cXmhKYVppR2NbeU54flZDal9RVBYiSV9jS3hTdUVhW39ddXdVRGRbUU91XQ==')

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
