import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtNum = (v) => new Intl.NumberFormat('pt-BR').format(v || 0);

// ── Dashboard do CONSORCIADO ──────────────────────────────
function DashboardConsorciado({ data }) {
    const navigate = useNavigate();
    if (!data.grupos?.length) return (
        <div className="card">
            <div className="empty-state">
                <div style={{ fontSize: 48 }}>🔗</div>
                <h4>Você ainda não está em nenhum grupo</h4>
                <p>Peça o link de convite ao gerente do grupo e entre!</p>
            </div>
        </div>
    );

    return (
        <div className="grupos-grid">
            {data.grupos.map(g => (
                <div key={g.id} className="grupo-card" onClick={() => navigate(`/pagamentos`)}>
                    <div className="grupo-header">
                        <div className="grupo-nome">{g.nome}</div>
                        {g.mes_contemplado
                            ? <span className="badge badge-teal">🏆 Mês {g.mes_contemplado}</span>
                            : <span className="badge badge-muted">Aguardando sorteio</span>}
                    </div>
                    <div className="grupo-meta">
                        <div className="meta-item"><strong>{fmt(g.valor_premio)}</strong>Prêmio</div>
                        <div className="meta-item"><strong>{g.ordem_sorteio ? `${g.ordem_sorteio}°` : '—'}</strong>Minha Posição</div>
                        <div className="meta-item"><strong style={{ color: 'var(--success)' }}>{g.parcelas_pagas}/{g.total_parcelas}</strong>Pagas</div>
                        <div className="meta-item"><strong style={{ color: 'var(--danger)' }}>{g.parcelas_atrasadas}</strong>Em atraso</div>
                    </div>
                    {parseInt(g.parcelas_atrasadas) > 0 && (
                        <div className="alert alert-danger" style={{ marginTop: 10, padding: '6px 12px', fontSize: 12 }}>
                            ⚠️ Você tem {g.parcelas_atrasadas} parcela(s) em atraso!
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ── Dashboard ADMIN / GERENTE ─────────────────────────────
function DashboardAdmin({ data }) {
    const navigate = useNavigate();
    const stats = [
        { icon: '💰', cls: 'purple', value: fmtNum(data.total_grupos), label: 'Total de Grupos', sub: `${data.grupos_ativos} ativos` },
        { icon: '👥', cls: 'teal', value: fmtNum(data.total_participantes), label: 'Participantes', sub: 'cadastrados' },
        { icon: '✅', cls: 'green', value: fmtNum(data.parcelas_pagas), label: 'Parcelas Pagas', sub: fmt(data.total_arrecadado) },
        { icon: '⏳', cls: 'yellow', value: fmtNum(data.parcelas_pendentes), label: 'A Vencer', sub: fmt(data.total_a_receber) },
        { icon: '🚨', cls: 'red', value: fmtNum(data.parcelas_atrasadas), label: 'Em Atraso', sub: '' },
    ];

    return (
        <div>
            <div className="stats-grid">
                {stats.map((s, i) => (
                    <div className="stat-card" key={i}>
                        <div className={`stat-icon ${s.cls}`} style={{ fontSize: 22 }}>{s.icon}</div>
                        <div className="stat-info">
                            <div className="value">{s.value}</div>
                            <div className="label">{s.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="card">
                <div className="page-header" style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Grupos Ativos Recentes</h3>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/grupos')}>Ver todos</button>
                </div>
                {!data.grupos_recentes?.length ? (
                    <div className="empty-state"><div>💼</div><h4>Nenhum grupo ativo</h4></div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>Grupo</th><th>Participantes</th><th>Prêmio</th><th>Situação</th></tr></thead>
                            <tbody>
                                {data.grupos_recentes.map(g => (
                                    <tr key={g.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/grupos/${g.id}`)}>
                                        <td><strong>{g.nome}</strong></td>
                                        <td>{g.participantes_atuais}/{g.total_participantes}</td>
                                        <td>{fmt(g.valor_premio)}</td>
                                        <td>{parseInt(g.inadimplentes) > 0
                                            ? <span className="badge badge-danger">🚨 {g.inadimplentes} inadimplente(s)</span>
                                            : <span className="badge badge-success">✅ Em dia</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────
export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { isRole, user } = useAuth();

    useEffect(() => {
        api.get('/dashboard')
            .then(r => setData(r.data))
            .catch(e => setError(e.response?.data?.error || 'Erro ao carregar dashboard'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="loading"><div className="spinner" /><span>Carregando...</span></div>;
    if (error) return <div className="alert alert-danger">⚠️ {error}</div>;
    if (!data) return null;

    if (isRole('consorciado')) return <DashboardConsorciado data={data} />;
    return <DashboardAdmin data={data} />;
}
