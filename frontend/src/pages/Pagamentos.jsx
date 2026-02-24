import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, RotateCcw } from 'lucide-react';
import api from '../api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

export default function Pagamentos() {
    const [grupos, setGrupos] = useState([]);
    const [grupoId, setGrupoId] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('');
    const [filtroParticipante, setFiltroParticipante] = useState('');
    const [parcelas, setParcelas] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/grupos').then(r => setGrupos(r.data)).catch(() => { });
    }, []);

    const loadParcelas = (gid = grupoId, sts = filtroStatus) => {
        if (!gid) return;
        setLoading(true);
        const params = {};
        if (sts) params.status = sts;
        api.get(`/parcelas/grupo/${gid}`, { params })
            .then(r => setParcelas(r.data))
            .catch(() => toast.error('Erro ao carregar parcelas'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadParcelas(); }, [grupoId, filtroStatus]);

    const pagar = async (id, status) => {
        if (status === 'pago') {
            if (!confirm('Estornar este pagamento?')) return;
            try {
                await api.put(`/parcelas/${id}/cancelar`);
                toast.success('Pagamento estornado');
                loadParcelas();
            } catch (e) { toast.error(e.response?.data?.error || 'Erro'); }
            return;
        }
        try {
            const r = await api.put(`/parcelas/${id}/pagar`, {});
            toast.success(r.data.multa_aplicada ? `Pago! Multa: ${fmt(r.data.valor_multa)}` : '✅ Parcela paga!');
            loadParcelas();
        } catch (e) { toast.error(e.response?.data?.error || 'Erro ao pagar'); }
    };

    const filtrados = parcelas.filter(p =>
        !filtroParticipante ||
        p.participante_nome.toLowerCase().includes(filtroParticipante.toLowerCase())
    );

    const statusBadge = (p) => {
        if (p.status === 'pago') return <span className="badge badge-success">✅ Pago</span>;
        if (p.status === 'atrasado') return <span className="badge badge-danger">🚨 Atrasado</span>;
        return <span className="badge badge-muted">⏳ Pendente</span>;
    };

    return (
        <div>
            <div className="page-header">
                <h3>Controle de Pagamentos</h3>
            </div>

            <div className="filters-row">
                <select value={grupoId} onChange={e => setGrupoId(e.target.value)} style={{ maxWidth: 260 }}>
                    <option value="">Selecione um grupo...</option>
                    {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
                <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                    <option value="">Todos os status</option>
                    <option value="pendente">⏳ Pendentes</option>
                    <option value="atrasado">🚨 Atrasados</option>
                    <option value="pago">✅ Pagos</option>
                </select>
                <input
                    placeholder="Filtrar por participante..."
                    value={filtroParticipante}
                    onChange={e => setFiltroParticipante(e.target.value)}
                    style={{ maxWidth: 220 }}
                />
            </div>

            <div className="card">
                {!grupoId ? (
                    <div className="empty-state">
                        <div style={{ fontSize: 40 }}>💳</div>
                        <h4>Selecione um grupo</h4>
                        <p>Escolha um grupo acima para ver os pagamentos</p>
                    </div>
                ) : loading ? (
                    <div className="loading"><div className="spinner" /><span>Carregando...</span></div>
                ) : filtrados.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: 40 }}>📭</div>
                        <h4>Nenhuma parcela encontrada</h4>
                        <p>Gere as parcelas no detalhe do grupo</p>
                    </div>
                ) : (
                    <>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                            {filtrados.length} parcelas • {fmt(filtrados.filter(p => p.status === 'pago').reduce((acc, p) => acc + parseFloat(p.valor_cota), 0))} arrecadado
                        </div>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Participante</th>
                                        <th>Mês</th>
                                        <th>Vencimento</th>
                                        <th>Valor Cota</th>
                                        <th>Multa</th>
                                        <th>Total</th>
                                        <th>Pagamento</th>
                                        <th>Status</th>
                                        <th>Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrados.map(p => (
                                        <tr key={p.id}>
                                            <td><strong>{p.participante_nome}</strong></td>
                                            <td><span className="badge badge-purple">Mês {p.numero_mes}</span></td>
                                            <td style={{ color: p.status === 'atrasado' ? 'var(--danger)' : 'inherit' }}>
                                                {fmtDate(p.data_vencimento)}
                                            </td>
                                            <td>{fmt(p.valor_cota)}</td>
                                            <td>{parseFloat(p.valor_multa) > 0 ? <span style={{ color: 'var(--danger)' }}>{fmt(p.valor_multa)}</span> : '—'}</td>
                                            <td><strong>{fmt(parseFloat(p.valor_cota) + parseFloat(p.valor_multa))}</strong></td>
                                            <td>{fmtDate(p.data_pagamento)}</td>
                                            <td>{statusBadge(p)}</td>
                                            <td>
                                                {p.status !== 'pago' ? (
                                                    <button className="btn btn-success btn-sm" onClick={() => pagar(p.id, p.status)}>
                                                        <CheckCircle size={13} /> Pagar
                                                    </button>
                                                ) : (
                                                    <button className="btn btn-secondary btn-sm" onClick={() => pagar(p.id, p.status)}>
                                                        <RotateCcw size={13} /> Estornar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
