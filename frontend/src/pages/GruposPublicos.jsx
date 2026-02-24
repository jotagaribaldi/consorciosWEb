import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function GrupoCard({ grupo, gerenteId, user, isAuth, isRole, onJoin, joining }) {
    const vaga = grupo.vagas_disponiveis;
    const lotado = vaga <= 0;
    const jaEntrou = grupo.ja_participante;

    return (
        <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 24,
            borderTop: `3px solid ${lotado ? 'var(--danger)' : 'var(--primary)'}`,
            display: 'flex', flexDirection: 'column', gap: 16,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{grupo.nome}</h3>
                    {grupo.descricao && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{grupo.descricao}</p>}
                </div>
                {lotado
                    ? <span className="badge badge-danger">Lotado</span>
                    : <span className="badge badge-success">{vaga} vaga(s)</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                    { label: 'Prêmio', value: fmt(grupo.valor_premio) },
                    { label: 'Cota inicial', value: fmt(grupo.valor_cota_inicial) },
                    { label: 'Incremento/mês', value: fmt(grupo.incremento_mensal) },
                    { label: 'Dia de pagamento', value: `Todo dia ${grupo.dia_pagamento}` },
                    { label: 'Participantes', value: `${grupo.total_participantes_atual}/${grupo.total_participantes}` },
                ].map((s, i) => (
                    <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {jaEntrou ? (
                <div className="alert alert-success" style={{ margin: 0, fontSize: 13 }}>
                    ✅ Você já é participante deste grupo
                </div>
            ) : !isAuth ? (
                <div style={{ display: 'flex', gap: 8 }}>
                    <Link to={`/cadastro?gerente=${gerenteId}&grupo=${grupo.id}`}
                        className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                        Criar conta e entrar
                    </Link>
                    <Link to={`/login?redirect=/grupos/publicos/${gerenteId}`}
                        className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                        Já tenho conta
                    </Link>
                </div>
            ) : !isRole('consorciado') ? (
                <div className="alert alert-warning" style={{ margin: 0, fontSize: 13 }}>
                    ⚠️ Apenas consorciados podem entrar em grupos via link
                </div>
            ) : lotado ? (
                <button className="btn btn-secondary" disabled style={{ width: '100%', justifyContent: 'center' }}>
                    Grupo lotado
                </button>
            ) : (
                <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => onJoin(grupo.id, grupo.nome)}
                    disabled={joining === grupo.id}
                >
                    {joining === grupo.id ? 'Entrando...' : `✓ Entrar neste grupo`}
                </button>
            )}
        </div>
    );
}

export default function GruposPublicos() {
    const { gerenteId } = useParams();
    const navigate = useNavigate();
    const { isAuth, isRole, user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(null);
    const [meuIds, setMeuIds] = useState(new Set());

    const load = async () => {
        try {
            const r = await api.get(`/invite/gerente/${gerenteId}`);
            setData(r.data);
        } catch (e) {
            toast.error(e.response?.data?.error || 'Link inválido ou gerente não encontrado');
        } finally {
            setLoading(false);
        }
    };

    // Carregar grupos em que o usuário já participa
    const loadMeus = async () => {
        if (!isAuth || !isRole('consorciado')) return;
        try {
            const r = await api.get('/parcelas/minhas');
            const ids = new Set(r.data.map(p => p.grupo_id));
            setMeuIds(ids);
        } catch { }
    };

    useEffect(() => {
        load();
        loadMeus();
    }, [gerenteId, isAuth]);

    const handleJoin = async (grupoId, nomeGrupo) => {
        setJoining(grupoId);
        try {
            const r = await api.post(`/invite/gerente/${gerenteId}/join/${grupoId}`);
            toast.success(r.data.message);
            setMeuIds(prev => new Set([...prev, grupoId]));
        } catch (e) {
            toast.error(e.response?.data?.error || 'Erro ao entrar no grupo');
        } finally {
            setJoining(null);
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loading"><div className="spinner" /><span>Carregando grupos...</span></div>
        </div>
    );

    if (!data) return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
                <h3>Link inválido</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Este link não é válido ou o gerente não está mais ativo.</p>
            </div>
        </div>
    );

    const { gerente, grupos } = data;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 20px' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{
                        width: 72, height: 72,
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 34, margin: '0 auto 16px',
                    }}>💰</div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                        Grupos de Consórcio
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
                        Gerenciados por <strong style={{ color: 'var(--text)' }}>{gerente.nome}</strong>
                    </p>

                    {/* Auth status */}
                    {isAuth ? (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12,
                            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 16px', fontSize: 13
                        }}>
                            <span style={{ color: 'var(--success)' }}>●</span>
                            Logado como <strong>{user?.nome}</strong>
                            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 10px', fontSize: 11 }}
                                onClick={() => navigate('/login?redirect=' + encodeURIComponent(window.location.pathname))}>
                                Trocar conta
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
                            <Link to={`/cadastro?gerente=${gerenteId}`} className="btn btn-primary">Criar conta grátis</Link>
                            <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="btn btn-secondary">Já tenho conta</Link>
                        </div>
                    )}
                </div>

                {/* Lista de grupos */}
                {grupos.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>😔</div>
                        <h3>Nenhum grupo disponível</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Este gerente não possui grupos abertos no momento.</p>
                    </div>
                ) : (
                    <div className="grupos-grid">
                        {grupos.map(g => (
                            <GrupoCard
                                key={g.id}
                                grupo={{ ...g, ja_participante: meuIds.has(g.id) }}
                                gerenteId={gerenteId}
                                user={user}
                                isAuth={isAuth}
                                isRole={isRole}
                                onJoin={handleJoin}
                                joining={joining}
                            />
                        ))}
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: 40, fontSize: 13, color: 'var(--text-muted)' }}>
                    Powered by <strong>ConsorciApp</strong>
                </div>
            </div>
        </div>
    );
}
