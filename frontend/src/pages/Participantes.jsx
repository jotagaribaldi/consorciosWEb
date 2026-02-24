import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function Participantes() {
    const [grupos, setGrupos] = useState([]);
    const [grupoId, setGrupoId] = useState('');
    const [participantes, setParticipantes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ nome: '', email: '', telefone: '' });
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/grupos').then(r => setGrupos(r.data));
    }, []);

    const loadParticipantes = (gid = grupoId) => {
        if (!gid) return;
        setLoading(true);
        api.get(`/participantes/grupo/${gid}`)
            .then(r => setParticipantes(r.data))
            .catch(() => toast.error('Erro ao carregar participantes'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadParticipantes(); }, [grupoId]);

    const openCreate = () => { setEditing(null); setForm({ nome: '', email: '', telefone: '' }); setModalOpen(true); };
    const openEdit = (p) => { setEditing(p); setForm({ nome: p.nome, email: p.email || '', telefone: p.telefone || '' }); setModalOpen(true); };

    const handleSave = async () => {
        if (!form.nome) { toast.error('Informe o nome'); return; }
        if (!grupoId) { toast.error('Selecione um grupo'); return; }
        try {
            if (editing) {
                await api.put(`/participantes/${editing.id}`, form);
                toast.success('Participante atualizado!');
            } else {
                await api.post('/participantes', { ...form, grupo_id: grupoId });
                toast.success('Participante adicionado!');
            }
            setModalOpen(false);
            loadParticipantes();
        } catch (e) { toast.error(e.response?.data?.error || 'Erro ao salvar'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Remover este participante?')) return;
        try {
            await api.delete(`/participantes/${id}`);
            toast.success('Removido!');
            loadParticipantes();
        } catch { toast.error('Erro ao remover'); }
    };

    const grupoAtual = grupos.find(g => g.id == grupoId);

    return (
        <div>
            <div className="page-header">
                <h3>Participantes</h3>
                {grupoId && participantes.length < (grupoAtual?.total_participantes || 99) && (
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Adicionar Participante
                    </button>
                )}
            </div>

            <div className="filters-row">
                <select value={grupoId} onChange={e => setGrupoId(e.target.value)} style={{ maxWidth: 300 }}>
                    <option value="">Selecione um grupo...</option>
                    {grupos.map(g => <option key={g.id} value={g.id}>{g.nome} ({g.total_participantes_atual}/{g.total_participantes})</option>)}
                </select>
                {grupoId && (
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/grupos/${grupoId}`)}>
                        <ExternalLink size={14} /> Ver Grupo Completo
                    </button>
                )}
            </div>

            <div className="card">
                {!grupoId ? (
                    <div className="empty-state">
                        <div style={{ fontSize: 40 }}>👥</div>
                        <h4>Selecione um grupo</h4>
                        <p>Escolha um grupo para ver seus participantes</p>
                    </div>
                ) : loading ? (
                    <div className="loading"><div className="spinner" /><span>Carregando...</span></div>
                ) : participantes.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: 40 }}>➕</div>
                        <h4>Nenhum participante</h4>
                        <p>Adicione o primeiro participante ao grupo</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                {participantes.length}/{grupoAtual?.total_participantes} vagas preenchidas
                            </span>
                            <div className="progress-bar" style={{ width: 120 }}>
                                <div className="progress-fill" style={{ width: `${(participantes.length / (grupoAtual?.total_participantes || 1)) * 100}%` }} />
                            </div>
                        </div>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Nome</th>
                                        <th>Telefone</th>
                                        <th>Email</th>
                                        <th>Parcelas Pagas</th>
                                        <th>Em Atraso</th>
                                        <th>Ordem Sorteio</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participantes.map((p, i) => (
                                        <tr key={p.id}>
                                            <td><span className="badge badge-purple">{i + 1}°</span></td>
                                            <td><strong>{p.nome}</strong></td>
                                            <td>
                                                {p.telefone ? (
                                                    <a href={`tel:${p.telefone}`} style={{ color: 'var(--secondary)' }}>{p.telefone}</a>
                                                ) : '—'}
                                            </td>
                                            <td>{p.email || '—'}</td>
                                            <td>
                                                <span className="badge badge-success">{p.parcelas_pagas || 0}/{p.total_parcelas || 0}</span>
                                            </td>
                                            <td>
                                                {parseInt(p.parcelas_atrasadas) > 0 ? (
                                                    <span className="badge badge-danger">🚨 {p.parcelas_atrasadas}</span>
                                                ) : (
                                                    <span className="badge badge-success">✅ Em dia</span>
                                                )}
                                            </td>
                                            <td>
                                                {p.ordem_sorteio
                                                    ? <span className="badge badge-teal">🏆 {p.ordem_sorteio}° (Mês {p.mes_contemplado})</span>
                                                    : <span className="badge badge-muted">Não sorteado</span>
                                                }
                                            </td>
                                            <td>
                                                <div className="actions">
                                                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(p)}>
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(p.id)}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Participante' : 'Novo Participante'}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="form-group">
                        <label>Nome Completo *</label>
                        <input placeholder="Nome completo" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label>Telefone / WhatsApp</label>
                        <input placeholder="(11) 99999-9999" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Salvar' : 'Adicionar'}</button>
                </div>
            </Modal>
        </div>
    );
}
