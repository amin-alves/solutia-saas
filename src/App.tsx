import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import SistemaLayout from './layouts/SistemaLayout'
import Dashboard from './pages/Dashboard'
import Documentos from './pages/Documentos'
import UpdatePassword from './pages/UpdatePassword'

export default function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
                <Route path="/" element={<LandingPage />} />

                {/* Rotas Privadas */}
                <Route path="/" element={<SistemaLayout />}>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="documentos" element={<Documentos />} />
                </Route>

                {/* Rota de Atualização de Senha */}
                <Route path="/update-password" element={<UpdatePassword />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    )
}
