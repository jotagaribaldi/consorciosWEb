import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Pencil, RefreshCw, Zap, Share2, Copy, MessageCircle } from 'lucide-react';
import api from '../api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const MESES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function GrupoDetalhe() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isRole } = useAuth();
    const [grupo, setGrupo] = useState(null);
    const [participantes, setParticipantes] = useState([]);
    const [parcelas, setParcelas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('participantes');
    const [pModalOpen, setPModalOpen] = useState(false);
    const [pForm, setPForm] = useState({ nome: '', email: '', telefone: '' });
    const [pEditing, setPEditing] = useState(null);
    const [gerandoParcelas, setGerandoParcelas] = useState(false);
    const [inviteModal, setInviteModal] = useState(false);
    const [inviteData, setInviteData] = useState(null);

    const fetchInvite = async () => {
        try {
            const r = await api.get(`/grupos/${id}/invite`);
            setInviteData(r.data);
            setInviteModal(true);
        } catch (e) { toast.error('Erro ao buscar link de convite'); }
    };

    const load = async () => {
        setLoading(true);
        try {
            const [gRes, parRes] = await Promise.all([
                api.get(`/grupos/${id}`),
                api.get(`/parcelas/grupo/${id}`),
            ]);
            setGrupo(gRes.data);
            setParticipantes(gRes.data.participantes || []);
            setParcelas(parRes.data);
        } catch (e) {
            toast.error('Erro ao carregar grupo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    const addParticipante = async () => {
        if (!pForm.nome) { toast.error('Informe o nome'); return; }
        try {
            if (pEditing) {
                await api.put(`/participantes/${pEditing.id}`, pForm);
                toast.success('Participante atualizado!');
            } else {
                await api.post('/participantes', { ...pForm, grupo_id: id });
                toast.success('Participante adicionado!');
            }
            setPModalOpen(false);
            setPForm({ nome: '', email: '', telefone: '' });
            setPEditing(null);
            load();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Erro ao salvar participante');
        }
    };

    const removeParticipante = async (pid) => {
        if (!confirm('Remover participante?')) return;
        try {
            await api.delete(`/participantes/${pid}`);
            toast.success('Participante removido');
            load();
        } catch { toast.error('Erro ao remover'); }
    };

    const gerarParcelas = async () => {
        if (!confirm('Gerar cronograma de parcelas para todos os participantes?')) return;
        setGerandoParcelas(true);
        try {
            const r = await api.post(`/grupos/${id}/gerar-parcelas`);
            toast.success(r.data.message);
            load();
            setTab('parcelas');
        } catch (e) {
            toast.error(e.response?.data?.error || 'Erro ao gerar parcelas');
        } finally {
            setGerandoParcelas(false);
        }
    };

    const pagarParcela = async (parcelaId, status) => {
        if (status === 'pago') {
            if (!confirm('Estornar pagamento?')) return;
            try {
                await api.put(`/parcelas/${parcelaId}/cancelar`);
                toast.success('Pagamento estornado');
                load();
            } catch (e) { toast.error(e.response?.data?.error || 'Erro ao estornar'); }
            return;
        }
        try {
            const r = await api.put(`/parcelas/${parcelaId}/pagar`, {});
            const msg = r.data.multa_aplicada
                ? `Pago! Multa aplicada: ${fmt(r.data.valor_multa)}`
                : 'Parcela marcada como paga!';
            toast.success(msg);
            load();
        } catch (e) { toast.error(e.response?.data?.error || 'Erro ao pagar'); }
    };

    const statusParcela = (p) => {
        if (p.status === 'pago') return <span className="badge badge-success">✅ Pago</span>;
        if (p.status === 'atrasado') return <span className="badge badge-danger">🚨 Atrasado</span>;
        return <span className="badge badge-muted">⏳ Pendente</span>;
    };

    if (loading) return <div className="loading"><div className="spinner" /><span>Carregando...</span></div>;
    if (!grupo) return <div className="alert alert-danger">Grupo não encontrado</div>;

    // Montar cronograma em matriz: participante × mês
    const participanteMap = {};
    participantes.forEach(p => { participanteMap[p.id] = p; });
    const parcelaMap = {};
    parcelas.forEach(p => {
        if (!parcelaMap[p.participante_id]) parcelaMap[p.participante_id] = {};
        parcelaMap[p.participante_id][p.numero_mes] = p;
    });
    const numMeses = grupo.total_participantes;

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => navigate('/grupos')}>
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h3>{grupo.nome}</h3>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            {fmt(grupo.valor_premio)} • {grupo.total_participantes} participantes • Dia {grupo.dia_pagamento}
                        </div>
                    </div>
                </div>
                <div className="actions">
                    {isRole('admin', 'gerente') && (
                        <button className="btn btn-secondary btn-sm" onClick={fetchInvite}>
                            <Share2 size={14} /> Compartilhar
                        </button>
                    )}
                    {parcelas.length === 0 && participantes.length > 0 && (
                        <button className="btn btn-warning" onClick={gerarParcelas} disabled={gerandoParcelas}>
                            <Zap size={16} /> {gerandoParcelas ? 'Gerando...' : 'Gerar Parcelas'}
                        </button>
                    )}
                    <button className="btn btn-secondary btn-sm btn-icon" onClick={load} title="Atualizar">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Resumo */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                {[
                    { label: 'Cota Inicial', value: fmt(grupo.valor_cota_inicial), icon: '💵' },
                    { label: 'Incremento/Mês', value: fmt(grupo.incremento_mensal), icon: '📈' },
                    { label: 'Multa Atraso', value: fmt(grupo.multa_atraso), icon: '⚠️' },
                    { label: 'Início', value: fmtDate(grupo.mes_inicio), icon: '📅' },
                ].map((s, i) => (
                    <div key={i} className="stat-card">
                        <div className="stat-icon purple" style={{ fontSize: 20 }}>{s.icon}</div>
                        <div className="stat-info">
                            <div className="value" style={{ fontSize: 16 }}>{s.value}</div>
                            <div className="label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${tab === 'participantes' ? 'active' : ''}`} onClick={() => setTab('participantes')}>
                    👥 Participantes ({participantes.length})
                </button>
                <button className={`tab ${tab === 'parcelas' ? 'active' : ''}`} onClick={() => setTab('parcelas')}>
                    📋 Cronograma ({parcelas.length > 0 ? '✓' : 'não gerado'})
                </button>
            </div>

            {/* ===== TAB PARTICIPANTES ===== */}
            {tab === 'participantes' && (
                <div className="card">
                    <div className="page-header" style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700 }}>
                            {participantes.length}/{grupo.total_participantes} participantes
                        </h3>
                        {participantes.length < grupo.total_participantes && (
                            <button className="btn btn-primary btn-sm" onClick={() => { setPEditing(null); setPForm({ nome: '', email: '', telefone: '' }); setPModalOpen(true); }}>
                                <Plus size={14} /> Adicionar
                            </button>
                        )}
                    </div>
                    {participantes.length === 0 ? (
                        <div className="empty-state">
                            <div style={{ fontSize: 40 }}>👥</div>
                            <h4>Nenhum participante</h4>
                            <p>Adicione os participantes do consórcio</p>
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Nome</th>
                                        <th>Telefone</th>
                                        <th>Email</th>
                                        <th>Ordem Sorteio</th>
                                        <th>Mês Contemplado</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participantes.map((p, i) => (
                                        <tr key={p.id}>
                                            <td><span className="badge badge-purple">{i + 1}°</span></td>
                                            <td><strong>{p.nome}</strong></td>
                                            <td>{p.telefone || '—'}</td>
                                            <td>{p.email || '—'}</td>
                                            <td>{p.ordem_sorteio ? <span className="badge badge-teal">{p.ordem_sorteio}°</span> : <span className="badge badge-muted">Não sorteado</span>}</td>
                                            <td>{p.mes_contemplado ? <span className="badge badge-success">Mês {p.mes_contemplado}</span> : '—'}</td>
                                            <td>
                                                <div className="actions">
                                                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => { setPEditing(p); setPForm({ nome: p.nome, email: p.email || '', telefone: p.telefone || '' }); setPModalOpen(true); }}>
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeParticipante(p.id)}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ===== TAB PARCELAS ===== */}
            {tab === 'parcelas' && (
                <div className="card">
                    {parcelas.length === 0 ? (
                        <div className="empty-state">
                            <div style={{ fontSize: 40 }}>📋</div>
                            <h4>Cronograma não gerado</h4>
                            <p>Adicione todos os participantes e clique em "Gerar Parcelas"</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                                Clique em uma parcela para registrar/estornar pagamento
                            </div>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Participante</th>
                                            {Array.from({ length: numMeses }, (_, i) => {
                                                // Calcular mês/ano do cabeçalho
                                                const inicio = new Date(grupo.mes_inicio);
                                                inicio.setMonth(inicio.getMonth() + i);
                                                return (
                                                    <th key={i} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                        Mês {i + 1}<br />
                                                        <span style={{ fontWeight: 400 }}>
                                                            {MESES_NOMES[inicio.getMonth()]}/{inicio.getFullYear().toString().slice(2)}
                                                        </span>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {participantes.map(p => (
                                            <tr key={p.id}>
                                                <td>
                                                    <strong>{p.nome}</strong>
                                                    {p.mes_contemplado && (
                                                        <span className="badge badge-teal" style={{ marginLeft: 6, fontSize: 10 }}>
                                                            🏆 Mês {p.mes_contemplado}
                                                        </span>
                                                    )}
                                                </td>
                                                {Array.from({ length: numMeses }, (_, i) => {
                                                    const mes = i + 1;
                                                    const parc = parcelaMap[p.id]?.[mes];
                                                    if (!parc) return <td key={i} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>—</td>;
                                                    return (
                                                        <td key={i} style={{ textAlign: 'center' }}>
                                                            <button
                                                                onClick={() => pagarParcela(parc.id, parc.status)}
                                                                className={`btn btn-sm ${parc.status === 'pago' ? 'btn-success' : parc.status === 'atrasado' ? 'btn-danger' : 'btn-secondary'}`}
                                                                style={{ fontSize: 11, padding: '4px 10px', minWidth: 90 }}
                                                                title={`${fmt(parc.valor_cota)}${parc.valor_multa > 0 ? ` + ${fmt(parc.valor_multa)} multa` : ''}`}
                                                            >
                                                                {fmt(parc.valor_cota)}
                                                                <br />
                                                                {parc.status === 'pago' ? '✅' : parc.status === 'atrasado' ? '🚨' : '⏳'}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* legenda */}
                            <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                                <span className="badge badge-success">✅ Pago</span>
                                <span className="badge badge-danger">🚨 Em atraso</span>
                                <span className="badge badge-muted">⏳ Pendente</span>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>*Clique para pagar/estornar</span>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Modal Participante */}
            <Modal isOpen={pModalOpen} onClose={() => setPModalOpen(false)} title={pEditing ? 'Editar Participante' : 'Novo Participante'}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="form-group">
                        <label>Nome Completo *</label>
                        <input placeholder="Nome do participante" value={pForm.nome}
                            onChange={e => setPForm(f => ({ ...f, nome: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label>Telefone / WhatsApp</label>
                        <input placeholder="(11) 99999-9999" value={pForm.telefone}
                            onChange={e => setPForm(f => ({ ...f, telefone: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" placeholder="nome@email.com" value={pForm.email}
                            onChange={e => setPForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setPModalOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={addParticipante}>
                        {pEditing ? 'Salvar' : 'Adicionar'}
                    </button>
                </div>
            </Modal>

            {/* Modal Convite/Compartilhar */}
            <Modal isOpen={inviteModal} onClose={() => setInviteModal(false)} title="🔗 Compartilhar Convite">
                {inviteData && (
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                            Compartilhe este link para que os participantes entrem no grupo.
                        </p>
                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label>Link de convite</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input readOnly value={inviteData.link} style={{ fontSize: 12 }} />
                                <button className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}
                                    onClick={() => { navigator.clipboard.writeText(inviteData.link); toast.success('Link copiado!'); }}>
                                    <Copy size={13} />
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <a href={inviteData.whatsapp} target="_blank" rel="noreferrer"
                                className="btn btn-success" style={{ flex: 1, justifyContent: 'center' }}>
                                <MessageCircle size={16} /> WhatsApp
                            </a>
                            <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
                                onClick={async () => {
                                    const r = await api.post(`/grupos/${id}/regenerate-invite`);
                                    setInviteData(r.data);
                                    toast.success('Novo link gerado!');
                                }}>
                                <RefreshCw size={14} /> Novo Link
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
