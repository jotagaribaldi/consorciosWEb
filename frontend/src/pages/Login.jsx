import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !senha) { toast.error('Preencha email e senha'); return; }
        setLoading(true);
        try {
            const user = await login(email, senha);
            toast.success(`Bem-vindo, ${user.nome}!`);
            navigate(from, { replace: true });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Credenciais inválidas');
        } finally {
            setLoading(false);
        }
    };

    const roleBadges = [
        { role: 'admin', label: 'Admin', desc: 'Gestão completa' },
        { role: 'gerente', label: 'Gerente', desc: 'Cria e gerencia grupos' },
        { role: 'consorciado', label: 'Consorciado', desc: 'Participa de grupos' },
    ];

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
        }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 64, height: 64,
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 30, margin: '0 auto 16px',
                    }}>💰</div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>ConsorciApp</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Gestão de consórcios entre amigos</p>
                </div>

                {/* Form */}
                <div className="card">
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Entrar na conta</h2>
                    <form onSubmit={handleLogin}>
                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label>Email</label>
                            <input
                                type="email" placeholder="seu@email.com"
                                value={email} onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label>Senha</label>
                            <input
                                type="password" placeholder="••••••••"
                                value={senha} onChange={e => setSenha(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading}>
                            {loading ? 'Entrando...' : '→ Entrar'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
                        Não tem conta?{' '}
                        <Link to="/cadastro" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>Cadastre-se</Link>
                    </div>
                </div>

                {/* Tipos de usuário */}
                <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                    {roleBadges.map(b => (
                        <div key={b.role} style={{
                            flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 10, padding: '12px', textAlign: 'center',
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{b.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{b.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
