import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Eye, Pencil, Share2 } from 'lucide-react';
import api from '../api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const defaultForm = {
    nome: '', descricao: '', total_participantes: 10,
    valor_premio: '', valor_cota_inicial: '', incremento_mensal: 5,
    dia_pagamento: 15, multa_atraso: 10, mes_inicio: '',
};

export default function Grupos() {
    const [grupos, setGrupos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    const getShareLink = () => {
        const base = window.location.origin;
        return `${base}/grupos/publicos/${user?.id}`;
    };

    const handleShare = (e, g) => {
        e.stopPropagation();
        const link = getShareLink();
        const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Olá! Participe do consórcio "${g.nome}"! Acesse o link e escolha seus grupos: ${link}`)}`;
        // Copy + open share options
        navigator.clipboard.writeText(link).catch(() => { });
        toast.success(
            (t) => (
                <span style={{ fontSize: 13 }}>
                    🔗 Link copiado!{' '}
                    <a href={whatsapp} target="_blank" rel="noreferrer"
                        style={{ color: '#25D366', fontWeight: 700 }}
                        onClick={() => toast.dismiss(t.id)}>
                        Abrir WhatsApp ↗
                    </a>
                </span>
            ),
            { duration: 6000 }
        );
    };

    const load = () => {
        setLoading(true);
        api.get('/grupos').then(r => setGrupos(r.data)).catch(() => toast.error('Erro ao carregar grupos'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => { setEditing(null); setForm(defaultForm); setModalOpen(true); };
    const openEdit = (e, g) => {
        e.stopPropagation();
        setEditing(g);
        setForm({
            nome: g.nome, descricao: g.descricao || '', total_participantes: g.total_participantes,
            valor_premio: g.valor_premio, valor_cota_inicial: g.valor_cota_inicial,
            incremento_mensal: g.incremento_mensal, dia_pagamento: g.dia_pagamento,
            multa_atraso: g.multa_atraso, mes_inicio: g.mes_inicio?.slice(0, 10),
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.nome || !form.valor_premio || !form.valor_cota_inicial || !form.mes_inicio) {
            toast.error('Preencha todos os campos obrigatórios'); return;
        }
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/grupos/${editing.id}`, { ...form, status: editing.status });
                toast.success('Grupo atualizado!');
            } else {
                await api.post('/grupos', form);
                toast.success('Grupo criado com sucesso!');
            }
            setModalOpen(false);
            load();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!confirm('Deseja remover este grupo e todos os dados associados?')) return;
        try {
            await api.delete(`/grupos/${id}`);
            toast.success('Grupo removido');
            load();
        } catch { toast.error('Erro ao remover grupo'); }
    };

    const statusBadge = (g) => {
        const map = { ativo: 'badge-success', encerrado: 'badge-muted', aguardando: 'badge-warning' };
        const labels = { ativo: '✅ Ativo', encerrado: '🏁 Encerrado', aguardando: '⏳ Aguardando' };
        return <span className={`badge ${map[g.status]}`}>{labels[g.status]}</span>;
    };

    return (
        <div>
            <div className="page-header">
                <h3>Grupos de Consórcio</h3>
                <button className="btn btn-primary" onClick={openCreate}>
                    <Plus size={16} /> Novo Grupo
                </button>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /><span>Carregando...</span></div>
            ) : grupos.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div style={{ fontSize: 48 }}>💼</div>
                        <h4>Nenhum grupo cadastrado</h4>
                        <p>Clique em "Novo Grupo" para começar</p>
                    </div>
                </div>
            ) : (
                <div className="grupos-grid">
                    {grupos.map(g => (
                        <div key={g.id} className="grupo-card" onClick={() => navigate(`/grupos/${g.id}`)}>
                            <div className="grupo-header">
                                <div>
                                    <div className="grupo-nome">{g.nome}</div>
                                    {g.descricao && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{g.descricao}</div>}
                                </div>
                                {statusBadge(g)}
                            </div>

                            <div className="grupo-meta">
                                <div className="meta-item">
                                    <strong>{fmt(g.valor_premio)}</strong>Prêmio Total
                                </div>
                                <div className="meta-item">
                                    <strong>{fmt(g.valor_cota_inicial)}</strong>Cota Inicial
                                </div>
                                <div className="meta-item">
                                    <strong>{g.total_participantes_atual || 0}/{g.total_participantes}</strong>Participantes
                                </div>
                                <div className="meta-item">
                                    <strong>Dia {g.dia_pagamento}</strong>Vencimento
                                </div>
                            </div>

                            {parseInt(g.total_participantes_atual) > 0 && (
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                                        <span>Participantes</span>
                                        <span>{g.total_participantes_atual}/{g.total_participantes}</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${(g.total_participantes_atual / g.total_participantes) * 100}%` }} />
                                    </div>
                                </div>
                            )}

                            {parseInt(g.total_inadimplentes) > 0 && (
                                <div className="alert alert-danger" style={{ marginTop: 12, marginBottom: 0, padding: '8px 12px' }}>
                                    ⚠️ {g.total_inadimplentes} parcela(s) em atraso
                                </div>
                            )}

                            <div className="actions" style={{ marginTop: 14 }} onClick={e => e.stopPropagation()}>
                                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/grupos/${g.id}`)}>
                                    <Eye size={14} /> Ver
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={(e) => openEdit(e, g)}>
                                    <Pencil size={14} /> Editar
                                </button>
                                <button className="btn btn-success btn-sm" onClick={(e) => handleShare(e, g)}
                                    title="Compartilhar link dos grupos deste gerente">
                                    <Share2 size={14} /> Compartilhar
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(e, g.id)}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Grupo' : 'Novo Grupo de Consórcio'}>
                <div className="form-grid">
                    <div className="form-group full">
                        <label>Nome do Grupo *</label>
                        <input placeholder="Ex: Consórcio dos Amigos 2026" value={form.nome}
                            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                    </div>
                    <div className="form-group full">
                        <label>Descrição</label>
                        <input placeholder="Descrição opcional" value={form.descricao}
                            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label>Nº de Participantes *</label>
                        <input type="number" min="2" value={form.total_participantes}
                            onChange={e => setForm(f => ({ ...f, total_participantes: parseInt(e.target.value) }))} />
                    </div>
                    <div className="form-group">
                        <label>Valor do Prêmio (R$) *</label>
                        <input type="number" step="0.01" placeholder="5000.00" value={form.valor_premio}
                            onChange={e => setForm(f => ({ ...f, valor_premio: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label>Cota Mensal Inicial (R$) *</label>
                        <input type="number" step="0.01" placeholder="500.00" value={form.valor_cota_inicial}
                            onChange={e => setForm(f => ({ ...f, valor_cota_inicial: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label>Incremento Mensal (R$) *</label>
                        <input type="number" step="0.01" placeholder="5.00" value={form.incremento_mensal}
                            onChange={e => setForm(f => ({ ...f, incremento_mensal: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label>Dia de Pagamento *</label>
                        <input type="number" min="1" max="28" value={form.dia_pagamento}
                            onChange={e => setForm(f => ({ ...f, dia_pagamento: parseInt(e.target.value) }))} />
                    </div>
                    <div className="form-group">
                        <label>Multa por Atraso (R$)</label>
                        <input type="number" step="0.01" placeholder="10.00" value={form.multa_atraso}
                            onChange={e => setForm(f => ({ ...f, multa_atraso: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label>Mês de Início *</label>
                        <input type="date" value={form.mes_inicio}
                            onChange={e => setForm(f => ({ ...f, mes_inicio: e.target.value }))} />
                    </div>
                    {editing && (
                        <div className="form-group">
                            <label>Status</label>
                            <select value={editing.status || 'ativo'} onChange={e => setEditing(ed => ({ ...ed, status: e.target.value }))}>
                                <option value="aguardando">Aguardando</option>
                                <option value="ativo">Ativo</option>
                                <option value="encerrado">Encerrado</option>
                            </select>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Grupo'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
