import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, UserCheck, UserX, RefreshCw } from 'lucide-react';
import api from '../api';

const roleLabels = { admin: 'Admin', gerente: 'Gerente', consorciado: 'Consorciado' };
const roleBadge = { admin: 'badge-danger', gerente: 'badge-teal', consorciado: 'badge-purple' };

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        api.get('/usuarios').then(r => setUsuarios(r.data)).catch(() => toast.error('Erro ao carregar usuários'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const updateRole = async (id, role) => {
        try {
            await api.put(`/usuarios/${id}`, { role });
            toast.success('Perfil atualizado!');
            load();
        } catch (e) { toast.error(e.response?.data?.error || 'Erro'); }
    };

    const toggleAtivo = async (u) => {
        try {
            await api.put(`/usuarios/${u.id}`, { ativo: !u.ativo });
            toast.success(u.ativo ? 'Usuário desativado' : 'Usuário ativado');
            load();
        } catch (e) { toast.error(e.response?.data?.error || 'Erro'); }
    };

    return (
        <div>
            <div className="page-header">
                <h3>Gerenciamento de Usuários</h3>
                <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={14} /> Atualizar</button>
            </div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
                {['admin', 'gerente', 'consorciado'].map(role => (
                    <div className="stat-card" key={role}>
                        <div className="stat-icon purple" style={{ fontSize: 22 }}>
                            {role === 'admin' ? '👑' : role === 'gerente' ? '🏢' : '👤'}
                        </div>
                        <div className="stat-info">
                            <div className="value">{usuarios.filter(u => u.role === role).length}</div>
                            <div className="label">{roleLabels[role]}s</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card">
                {loading ? (
                    <div className="loading"><div className="spinner" /><span>Carregando...</span></div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Email</th>
                                    <th>Perfil</th>
                                    <th>Grupos Gerenciados</th>
                                    <th>Status</th>
                                    <th>Alterar Perfil</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map(u => (
                                    <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.5 }}>
                                        <td><strong>{u.nome}</strong></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.email}</td>
                                        <td><span className={`badge ${roleBadge[u.role]}`}>{roleLabels[u.role]}</span></td>
                                        <td>{parseInt(u.grupos_gerenciados) > 0 ? <span className="badge badge-teal">{u.grupos_gerenciados} grupo(s)</span> : '—'}</td>
                                        <td>{u.ativo ? <span className="badge badge-success">✅ Ativo</span> : <span className="badge badge-danger">❌ Inativo</span>}</td>
                                        <td>
                                            <select
                                                value={u.role}
                                                onChange={e => updateRole(u.id, e.target.value)}
                                                style={{ fontSize: 12, padding: '4px 8px' }}
                                            >
                                                <option value="consorciado">Consorciado</option>
                                                <option value="gerente">Gerente</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td>
                                            <button
                                                className={`btn btn-sm ${u.ativo ? 'btn-danger' : 'btn-success'}`}
                                                onClick={() => toggleAtivo(u)}
                                            >
                                                {u.ativo ? <><UserX size={13} /> Desativar</> : <><UserCheck size={13} /> Ativar</>}
                                            </button>
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
