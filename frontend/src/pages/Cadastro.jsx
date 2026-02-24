import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Cadastro() {
    const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '' });
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const gerenteId = searchParams.get('gerente');
    const redirectAfter = gerenteId ? `/grupos/publicos/${gerenteId}` : '/';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nome || !form.email || !form.senha) { toast.error('Preencha todos os campos'); return; }
        if (form.senha !== form.confirmar) { toast.error('Senhas não conferem'); return; }
        if (form.senha.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
        setLoading(true);
        try {
            await register(form.nome, form.email, form.senha);
            toast.success('Conta criada! Bem-vindo(a)!');
            navigate(redirectAfter);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 64, height: 64,
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 30, margin: '0 auto 16px',
                    }}>💰</div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Criar conta</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cadastre-se como Consorciado</p>
                </div>

                <div className="card">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label>Nome Completo</label>
                            <input placeholder="Seu nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label>Email</label>
                            <input type="email" placeholder="seu@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label>Senha</label>
                            <input type="password" placeholder="Mínimo 6 caracteres" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label>Confirmar Senha</label>
                            <input type="password" placeholder="Repita a senha" value={form.confirmar} onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))} />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading}>
                            {loading ? 'Criando conta...' : '✓ Criar conta'}
                        </button>
                    </form>
                    <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
                        Já tem conta?{' '}
                        <Link to="/login" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>Entrar</Link>
                    </div>
                </div>

                <div className="alert alert-warning" style={{ marginTop: 16, fontSize: 13 }}>
                    ⚠️ Novas contas são criadas como <strong>Consorciado</strong>. Para se tornar Gerente, peça ao administrador.
                </div>
            </div>
        </div>
    );
}
