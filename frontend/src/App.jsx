import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import JoinGrupo from './pages/JoinGrupo';
import GruposPublicos from './pages/GruposPublicos';
import Dashboard from './pages/Dashboard';
import Grupos from './pages/Grupos';
import GrupoDetalhe from './pages/GrupoDetalhe';
import Participantes from './pages/Participantes';
import Pagamentos from './pages/Pagamentos';
import Sorteio from './pages/Sorteio';
import Inadimplentes from './pages/Inadimplentes';
import Usuarios from './pages/Usuarios';
import './index.css';

const toastStyle = {
  style: {
    background: '#1A1A2E', color: '#F0F0F8',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', fontSize: '14px',
  },
};

function AccesoNegado() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>🚫</div>
        <h2 style={{ margin: '16px 0 8px' }}>Acesso não autorizado</h2>
        <p style={{ color: 'var(--text-muted)' }}>Você não tem permissão para acessar esta página.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={toastStyle} />
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/join/:token" element={<JoinGrupo />} />
          <Route path="/grupos/publicos/:gerenteId" element={<GruposPublicos />} />
          <Route path="/acesso-negado" element={<AccesoNegado />} />

          {/* Protegidas (dentro do Layout) */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/grupos" element={
            <ProtectedRoute roles={['admin', 'gerente']}>
              <Layout><Grupos /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/grupos/:id" element={
            <ProtectedRoute roles={['admin', 'gerente']}>
              <Layout><GrupoDetalhe /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/participantes" element={
            <ProtectedRoute roles={['admin', 'gerente']}>
              <Layout><Participantes /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/pagamentos" element={
            <ProtectedRoute>
              <Layout><Pagamentos /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/sorteio" element={
            <ProtectedRoute roles={['admin', 'gerente']}>
              <Layout><Sorteio /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/inadimplentes" element={
            <ProtectedRoute roles={['admin', 'gerente']}>
              <Layout><Inadimplentes /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/usuarios" element={
            <ProtectedRoute roles={['admin']}>
              <Layout><Usuarios /></Layout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
