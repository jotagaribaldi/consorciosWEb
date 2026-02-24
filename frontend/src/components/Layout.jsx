import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Wallet, CreditCard,
    Shuffle, AlertTriangle, LogOut, Settings, UserCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const allNavItems = [
    { to: '/', icon: <LayoutDashboard />, label: 'Dashboard', roles: ['admin', 'gerente', 'consorciado'] },
    { to: '/grupos', icon: <Wallet />, label: 'Grupos', roles: ['admin', 'gerente'] },
    { to: '/participantes', icon: <Users />, label: 'Participantes', roles: ['admin', 'gerente'] },
    { to: '/pagamentos', icon: <CreditCard />, label: 'Pagamentos', roles: ['admin', 'gerente', 'consorciado'] },
    { to: '/sorteio', icon: <Shuffle />, label: 'Sorteio', roles: ['admin', 'gerente'] },
    { to: '/inadimplentes', icon: <AlertTriangle />, label: 'Inadimplentes', roles: ['admin', 'gerente'] },
    { to: '/usuarios', icon: <Settings />, label: 'Usuários', roles: ['admin'] },
];

const pageTitles = {
    '/': { title: 'Dashboard' },
    '/grupos': { title: 'Grupos' },
    '/participantes': { title: 'Participantes' },
    '/pagamentos': { title: 'Pagamentos' },
    '/sorteio': { title: 'Sorteio' },
    '/inadimplentes': { title: 'Inadimplentes' },
    '/usuarios': { title: 'Usuários' },
};

const roleLabel = { admin: '👑 Admin', gerente: '🏢 Gerente', consorciado: '👤 Consorciado' };
const roleBadgeClass = { admin: 'badge-danger', gerente: 'badge-teal', consorciado: 'badge-purple' };

export default function Layout({ children }) {
    const location = useLocation();
    const { user, isRole, logout } = useAuth();
    const path = location.pathname;
    const match = Object.keys(pageTitles).filter(k => k !== '/' && path.startsWith(k));
    const pageKey = match.length > 0 ? match[match.length - 1] : '/';
    const pageInfo = pageTitles[pageKey] || { title: 'ConsorciApp' };

    const navItems = allNavItems.filter(item => !user || item.roles.some(r => isRole(r)));

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-icon">💰</div>
                    <div>
                        <h1>ConsorciApp</h1>
                        <span>Gestão de Consórcios</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <div className="nav-section">Menu</div>
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) => isActive ? 'active' : ''}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User info + logout */}
                {user && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14, fontWeight: 700, flexShrink: 0,
                            }}>
                                {user.nome?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.nome}</div>
                                <span className={`badge ${roleBadgeClass[user.role]}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                                    {roleLabel[user.role]}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="btn btn-secondary btn-sm"
                            style={{ width: '100%', justifyContent: 'center', gap: 6, fontSize: 12 }}
                        >
                            <LogOut size={13} /> Sair
                        </button>
                    </div>
                )}
            </aside>

            <main className="main-content">
                <div className="topbar">
                    <div>
                        <h2>{pageInfo.title}</h2>
                    </div>
                </div>
                <div className="page">
                    {children}
                </div>
            </main>
        </div>
    );
}
