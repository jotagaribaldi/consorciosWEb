import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function JoinGrupo() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { isAuth, isRole, user } = useAuth();
    const [grupo, setGrupo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [telefone, setTelefone] = useState('');
    const [joined, setJoined] = useState(false);

    useEffect(() => {
        api.get(`/invite/${token}`)
            .then(r => setGrupo(r.data))
            .catch(e => toast.error(e.response?.data?.error || 'Link inválido ou expirado'))
            .finally(() => setLoading(false));
    }, [token]);

    const handleJoin = async () => {
        if (!isAuth) {
            toast.error('Você precisa entrar ou se cadastrar primeiro!');
            navigate('/cadastro', { state: { redirect: `/join/${token}` } });
            return;
        }
        if (!isRole('consorciado')) {
            toast.error('Apenas usuários do tipo Consorciado podem entrar em grupos via convite');
            return;
        }
        setJoining(true);
        try {
            const r = await api.post(`/invite/${token}/join`, { telefone });
            toast.success(r.data.message);
            setJoined(true);
        } catch (e) {
            toast.error(e.response?.data?.error || 'Erro ao entrar no grupo');
        } finally {
            setJoining(false);
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loading"><div className="spinner" /><span>Carregando convite...</span></div>
        </div>
    );

    if (!grupo) return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
                <div style={{ fontSize: 48 }}>🚫</div>
                <h3 style={{ margin: '16px 0 8px' }}>Link inválido</h3>
                <p style={{ color: 'var(--text-muted)' }}>Este link de convite é inválido ou expirou.</p>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 480 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 48 }}>💰</div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 12 }}>Convite para Consórcio</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Você foi convidado para participar!</p>
                </div>

                <div className="card">
                    <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{grupo.nome}</h2>
                    {grupo.descricao && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>{grupo.descricao}</p>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                        {[
                            { label: 'Prêmio Total', value: fmt(grupo.valor_premio) },
                            { label: 'Cota Inicial', value: fmt(grupo.valor_cota_inicial) },
                            { label: 'Incremento/Mês', value: fmt(grupo.incremento_mensal) },
                            { label: 'Vagas', value: `${grupo.vagas_disponiveis}/${grupo.total_participantes}` },
                            { label: 'Dia de Pagamento', value: `Todo dia ${grupo.dia_pagamento}` },
                            { label: 'Gerente', value: grupo.gerente_nome || '—' },
                        ].map((s, i) => (
                            <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.value}</div>
                            </div>
                        ))}
                    </div>

                    {grupo.vagas_disponiveis <= 0 && (
                        <div className="alert alert-danger">😔 Não há vagas disponíveis neste grupo.</div>
                    )}

                    {joined ? (
                        <div className="alert alert-success" style={{ textAlign: 'center' }}>
                            🎉 Você entrou no grupo com sucesso!{' '}
                            <button className="btn btn-primary btn-sm" style={{ marginLeft: 8 }} onClick={() => navigate('/')}>
                                Ver meu dashboard
                            </button>
                        </div>
                    ) : grupo.vagas_disponiveis > 0 ? (
                        <>
                            {isAuth && isRole('consorciado') && (
                                <div className="form-group" style={{ marginBottom: 16 }}>
                                    <label>Seu Telefone / WhatsApp (opcional)</label>
                                    <input placeholder="(11) 99999-9999" value={telefone} onChange={e => setTelefone(e.target.value)} />
                                </div>
                            )}

                            {!isAuth ? (
                                <div>
                                    <div className="alert alert-warning" style={{ marginBottom: 12 }}>
                                        ⚠️ Você precisa ter uma conta para entrar no grupo.
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(`/cadastro`)}>
                                            Criar conta
                                        </button>
                                        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(`/login`)}>
                                            Já tenho conta
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                                    onClick={handleJoin} disabled={joining}>
                                    {joining ? 'Entrando...' : `✓ Entrar no grupo como ${user?.nome}`}
                                </button>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
