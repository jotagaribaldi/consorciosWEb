import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, CheckCircle } from 'lucide-react';
import api from '../api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const diasAtraso = (dataVenc) => {
    const hoje = new Date();
    const venc = new Date(dataVenc);
    const diff = Math.floor((hoje - venc) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
};

export default function Inadimplentes() {
    const [inadimplentes, setInadimplentes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroGrupo, setFiltroGrupo] = useState('');
    const [filtroNome, setFiltroNome] = useState('');

    const load = () => {
        setLoading(true);
        api.get('/parcelas/inadimplentes/todos')
            .then(r => setInadimplentes(r.data))
            .catch(() => toast.error('Erro ao carregar inadimplentes'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const pagar = async (id) => {
        try {
            const r = await api.put(`/parcelas/${id}/pagar`, {});
            const msg = r.data.multa_aplicada
                ? `Pago! Multa de ${fmt(r.data.valor_multa)} aplicada`
                : 'Parcela paga!';
            toast.success(msg);
            load();
        } catch (e) { toast.error(e.response?.data?.error || 'Erro ao registrar pagamento'); }
    };

    const grupos = [...new Set(inadimplentes.map(i => i.grupo_nome))];
    const filtrados = inadimplentes.filter(i =>
        (!filtroGrupo || i.grupo_nome === filtroGrupo) &&
        (!filtroNome || i.participante_nome.toLowerCase().includes(filtroNome.toLowerCase()))
    );

    const totalEmAtraso = filtrados.reduce((s, i) => s + parseFloat(i.valor_cota) + parseFloat(i.multa_atraso), 0);

    return (
        <div>
            <div className="page-header">
                <h3>Inadimplentes</h3>
                <button className="btn btn-secondary btn-sm" onClick={load}>
                    <RefreshCw size={14} /> Atualizar
                </button>
            </div>

            {inadimplentes.length > 0 && (
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                    <div className="stat-card">
                        <div className="stat-icon red" style={{ fontSize: 20 }}>🚨</div>
                        <div className="stat-info">
                            <div className="value">{inadimplentes.length}</div>
                            <div className="label">Parcelas em Atraso</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon yellow" style={{ fontSize: 20 }}>💸</div>
                        <div className="stat-info">
                            <div className="value" style={{ fontSize: 16 }}>{fmt(totalEmAtraso)}</div>
                            <div className="label">Total a Cobrar (com multa)</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon purple" style={{ fontSize: 20 }}>👥</div>
                        <div className="stat-info">
                            <div className="value">{new Set(inadimplentes.map(i => i.participante_id)).size}</div>
                            <div className="label">Consorciados Inadimplentes</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="filters-row" style={{ marginBottom: 16 }}>
                <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)} style={{ maxWidth: 260 }}>
                    <option value="">Todos os grupos</option>
                    {grupos.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <input
                    placeholder="Filtrar por participante..."
                    value={filtroNome}
                    onChange={e => setFiltroNome(e.target.value)}
                    style={{ maxWidth: 220 }}
                />
            </div>

            <div className="card">
                {loading ? (
                    <div className="loading"><div className="spinner" /><span>Carregando...</span></div>
                ) : filtrados.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: 48 }}>🌟</div>
                        <h4>Nenhum inadimplente!</h4>
                        <p>Todos os pagamentos estão em dia</p>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Participante</th>
                                    <th>Grupo</th>
                                    <th>Mês</th>
                                    <th>Vencimento</th>
                                    <th>Dias de Atraso</th>
                                    <th>Valor Cota</th>
                                    <th>Multa</th>
                                    <th>Total a Cobrar</th>
                                    <th>Contato</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.map(p => {
                                    const dias = diasAtraso(p.data_vencimento);
                                    return (
                                        <tr key={p.id}>
                                            <td><strong>{p.participante_nome}</strong></td>
                                            <td><span className="badge badge-purple">{p.grupo_nome}</span></td>
                                            <td><span className="badge badge-muted">Mês {p.numero_mes}</span></td>
                                            <td style={{ color: 'var(--danger)' }}>{fmtDate(p.data_vencimento)}</td>
                                            <td>
                                                <span className={`badge ${dias > 30 ? 'badge-danger' : 'badge-warning'}`}>
                                                    {dias}d
                                                </span>
                                            </td>
                                            <td>{fmt(p.valor_cota)}</td>
                                            <td style={{ color: 'var(--danger)' }}>+ {fmt(p.multa_atraso)}</td>
                                            <td>
                                                <strong style={{ color: 'var(--danger)' }}>
                                                    {fmt(parseFloat(p.valor_cota) + parseFloat(p.multa_atraso))}
                                                </strong>
                                            </td>
                                            <td>
                                                {p.telefone ? (
                                                    <a
                                                        href={`https://wa.me/55${p.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${p.participante_nome}, sua parcela do consórcio "${p.grupo_nome}" venceu em ${fmtDate(p.data_vencimento)}. Valor: ${fmt(parseFloat(p.valor_cota) + parseFloat(p.multa_atraso))} (inclui multa de ${fmt(p.multa_atraso)}). Por favor, regularize sua situação.`)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-success btn-sm"
                                                    >
                                                        📱 WhatsApp
                                                    </a>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sem contato</span>
                                                )}
                                            </td>
                                            <td>
                                                <button className="btn btn-success btn-sm" onClick={() => pagar(p.id)}>
                                                    <CheckCircle size={13} /> Pagar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
