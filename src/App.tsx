import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import SistemaLayout from './layouts/SistemaLayout'
import Dashboard from './pages/Dashboard'
import Usuarios from './pages/Usuarios'
import Documentos from './pages/Documentos'

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LandingPage />} />

                {/* Rotas Privadas */}
                <Route path="/" element={<SistemaLayout />}>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="usuarios" element={<Usuarios />} />
                    <Route path="documentos" element={<Documentos />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    )
}
