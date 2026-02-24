import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shuffle, Trophy } from 'lucide-react';
import api from '../api';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function Sorteio() {
    const [grupos, setGrupos] = useState([]);
    const [grupoId, setGrupoId] = useState('');
    const [grupo, setGrupo] = useState(null);
    const [resultado, setResultado] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sorteando, setSorteando] = useState(false);

    useEffect(() => {
        api.get('/grupos').then(r => setGrupos(r.data));
    }, []);

    const loadSorteio = async (gid) => {
        if (!gid) return;
        setLoading(true);
        try {
            const [gRes, sRes] = await Promise.all([
                api.get(`/grupos/${gid}`),
                api.get(`/sorteio/${gid}`),
            ]);
            setGrupo(gRes.data);
            setResultado(sRes.data);
        } catch { toast.error('Erro ao carregar sorteio'); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (grupoId) loadSorteio(grupoId); }, [grupoId]);

    const realizarSorteio = async (force = false) => {
        if (!grupoId) { toast.error('Selecione um grupo'); return; }
        if (resultado.some(r => r.ordem_sorteio) && !force) {
            if (!confirm('Já existe um sorteio para este grupo. Deseja REFAZER? A ordem atual será perdida!')) return;
            force = true;
        }
        setSorteando(true);
        try {
            const r = await api.post(`/sorteio/${grupoId}`, { force });
            toast.success(r.data.message);
            setResultado(r.data.resultado);
            loadSorteio(grupoId);
        } catch (e) {
            toast.error(e.response?.data?.error || 'Erro ao realizar sorteio');
        } finally { setSorteando(false); }
    };

    const jaSorteado = resultado.some(r => r.ordem_sorteio);

    // Calcular mês de referência para cada posição
    const getMesRef = (ordem) => {
        if (!grupo?.mes_inicio) return '';
        const d = new Date(grupo.mes_inicio);
        d.setMonth(d.getMonth() + (ordem - 1));
        return `${MESES[d.getMonth()]}/${d.getFullYear()}`;
    };

    return (
        <div>
            <div className="page-header">
                <h3>Sorteio de Contemplação</h3>
            </div>

            <div className="filters-row" style={{ marginBottom: 24 }}>
                <select value={grupoId} onChange={e => setGrupoId(e.target.value)} style={{ maxWidth: 300 }}>
                    <option value="">Selecione um grupo...</option>
                    {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
                {grupoId && (
                    <button className="btn btn-primary" onClick={() => realizarSorteio(false)} disabled={sorteando}>
                        <Shuffle size={16} />
                        {sorteando ? 'Sorteando...' : jaSorteado ? 'Refazer Sorteio' : 'Realizar Sorteio'}
                    </button>
                )}
            </div>

            {!grupoId ? (
                <div className="card">
                    <div className="empty-state">
                        <div style={{ fontSize: 48 }}>🎲</div>
                        <h4>Selecione um grupo</h4>
                        <p>Escolha um grupo para ver ou realizar o sorteio</p>
                    </div>
                </div>
            ) : loading ? (
                <div className="loading"><div className="spinner" /><span>Carregando...</span></div>
            ) : resultado.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div style={{ fontSize: 48 }}>👥</div>
                        <h4>Nenhum participante</h4>
                        <p>Adicione participantes ao grupo antes de realizar o sorteio</p>
                    </div>
                </div>
            ) : !jaSorteado ? (
                <div className="card">
                    <div className="empty-state">
                        <Shuffle size={48} style={{ color: 'var(--primary)', opacity: 0.5, marginBottom: 12 }} />
                        <h4>Sorteio não realizado</h4>
                        <p>Clique em "Realizar Sorteio" para definir a ordem de contemplação</p>
                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => realizarSorteio(false)}>
                            <Shuffle size={16} /> Realizar Sorteio Agora
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="alert alert-success" style={{ marginBottom: 20 }}>
                        🏆 Sorteio realizado! Ordem de contemplação definida para {resultado.length} participantes.
                    </div>
                    <div className="sorteio-grid">
                        {resultado.sort((a, b) => a.ordem_sorteio - b.ordem_sorteio).map(p => (
                            <div key={p.id} className="sorteio-card">
                                {p.ordem_sorteio === 1 && (
                                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                                        <Trophy size={16} style={{ color: 'var(--warning)' }} />
                                    </div>
                                )}
                                <div className="ordem">{p.ordem_sorteio}°</div>
                                <div className="nome">{p.nome}</div>
                                <div className="mes-label">
                                    📅 Recebe em: <strong>{getMesRef(p.ordem_sorteio)}</strong>
                                </div>
                                <div className="mes-label" style={{ marginTop: 4 }}>
                                    <span className="badge badge-teal">Mês {p.mes_contemplado}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
