'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Replace, FileText, UserCog, LogOut, TrendingUp, BarChart2, Briefcase, ChevronDown, ChevronUp, Image, Database, List } from 'lucide-react';
import { useActiveAccount } from '@/components/trading/AccountContext';
import styles from './Sidebar.module.css';

const navItems = [
    { href: '/dashboard', label: 'Resumen General', icon: LayoutDashboard },
    { href: '/producers', label: 'Productores', icon: Users },
    { href: '/operations', label: 'Operaciones', icon: Replace },
    { href: '/reports', label: 'Reportes', icon: FileText },
    { href: '/usuarios', label: 'Usuarios', icon: UserCog },
];

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [plan, setPlan] = useState('free');
    const [isAccountsOpen, setIsAccountsOpen] = useState(false);
    const { activeAccount, setAccount } = useActiveAccount() || {};
    const [accounts, setAccounts] = useState([]);

    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => r.json())
            .then(data => {
                if (data.nombre) {
                    setUser({ username: data.nombre, email: data.email, role: 'USER' });
                    setPlan(data.plan || 'free');
                }
            })
            .catch(() => setUser({ username: 'Trader', role: 'USER' }));
        
        if (pathname.startsWith('/trading')) {
            fetch('/api/trading/accounts')
                .then(res => res.json())
                .then(data => setAccounts(data))
                .catch(console.error);
        }

        if (pathname === '/trading?action=create') {
            setIsAccountsOpen(true);
        }
    }, [pathname]);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    };

    const visibleNavItems = navItems.filter(item => {
        if (item.href === '/usuarios' && user?.username !== 'ronalbis') return false;
        return true;
    });

    const isReports = pathname.startsWith('/reports');

    return (
        <>
            {isReports && isMobileMenuOpen && (
                <div 
                    className={styles.mobileOverlay} 
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
            <aside className={`${styles.sidebar} ${isReports ? styles.mobileSidebar : ''} ${isMobileMenuOpen ? styles.open : ''}`}>
                <div className={styles.logo} style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '2rem' }}>
                      <img
                        src="/logo.png"
                        alt="Travitrade"
                        style={{ height: '56px', width: 'auto', objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                </div>
            <nav className={styles.nav}>
                {!pathname.startsWith('/trading') && visibleNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <Icon size={20} />
                            {item.label}
                        </Link>
                    );
                })}

                {pathname.startsWith('/trading') && (
                    <>
                        <div style={{ padding: '0 1rem 1rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>
                                Cuenta Activa
                            </label>
                            <select 
                                value={activeAccount?.id || ''} 
                                onChange={(e) => {
                                    const acc = accounts.find(a => a.id === parseInt(e.target.value));
                                    if(acc && setAccount) setAccount(acc);
                                }}
                                style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', color: 'var(--white)', border: '1px solid var(--accent-primary)', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                <option value="" disabled>Seleccionar Cuenta</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                                ))}
                            </select>
                        </div>

                        <Link href="/trading/dashboard" className={`${styles.navItem} ${pathname === '/trading/dashboard' ? styles.active : ''}`}>
                            <TrendingUp size={20} /> Dashboard Trading
                        </Link>

                        <div className={styles.navGroup}>
                            <div
                                className={`${styles.navItem} ${styles.navGroupBtn} ${pathname === '/trading' || pathname.startsWith('/trading/cuenta') ? styles.active : ''}`}
                                onClick={() => {
                                    setIsAccountsOpen(!isAccountsOpen);
                                    router.push('/trading');
                                }}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <rect x="1" y="2" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                                        <path d="M4 6h6M4 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                    Centro de Cuentas
                                </div>
                                <span style={{ fontSize: '10px', opacity: 0.5 }}>{isAccountsOpen ? '▲' : '▼'}</span>
                            </div>
                            
                            {isAccountsOpen && (
                                <div className={styles.subMenu}>
                                    <Link href="/trading?action=create" className={styles.subMenuItem}>
                                        Crear Cuenta
                                    </Link>
                                    <Link href="/trading" className={styles.subMenuItem}>
                                        Editar Cuentas
                                    </Link>
                                </div>
                            )}
                        </div>

                        <Link href="/trading/operations" className={`${styles.navItem} ${pathname === '/trading/operations' ? styles.active : ''}`}>
                            <BarChart2 size={20} /> Operaciones
                        </Link>

                        {plan === 'free' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', color: 'rgba(159,225,203,0.3)', fontSize: '13px', cursor: 'not-allowed', position: 'relative' }}
                            title="Disponible en Plan Pro">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <rect x="3" y="6" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M5 6V4a2 2 0 014 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            Reportes
                            <span style={{ fontSize: '9px', background: '#1D9E75', color: '#fff', padding: '1px 6px', borderRadius: '10px', marginLeft: 'auto' }}>PRO</span>
                          </div>
                        ) : (
                          <Link href="/trading/reportes" className={`${styles.navItem} ${pathname === '/trading/reportes' ? styles.active : ''}`}>
                              <FileText size={20} /> Reportes
                          </Link>
                        )}

                        {plan === 'free' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', color: 'rgba(159,225,203,0.3)', fontSize: '13px', cursor: 'not-allowed' }}
                            title="Disponible en Plan Pro">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <rect x="3" y="6" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M5 6V4a2 2 0 014 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            Calendario
                            <span style={{ fontSize: '9px', background: '#1D9E75', color: '#fff', padding: '1px 6px', borderRadius: '10px', marginLeft: 'auto' }}>PRO</span>
                          </div>
                        ) : (
                          <Link href="/trading/calendario" className={`${styles.navItem} ${pathname.startsWith('/trading/calendario') ? styles.active : ''}`}>
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                                  <rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                                  <path d="M1 6h14" stroke="currentColor" strokeWidth="1.5"/>
                                  <path d="M5 1v2M11 1v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <rect x="4" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
                                  <rect x="7" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
                                  <rect x="10" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
                              </svg>
                              Calendario
                          </Link>
                        )}

                        <Link href="/trading/commissions" className={`${styles.navItem} ${pathname === '/trading/commissions' ? styles.active : ''}`}>
                            <Users size={20} /> Comisiones
                        </Link>

                        <Link href="/trading/watchlist" className={`${styles.navItem} ${pathname === '/trading/watchlist' ? styles.active : ''}`}>
                            <List size={20} /> Watchlist
                        </Link>

                        <Link href="/trading/respaldo" className={`${styles.navItem} ${pathname === '/trading/respaldo' ? styles.active : ''}`}>
                            <Database size={20} /> Respaldo
                        </Link>
                    </>
                )}
            </nav>
            <div className={styles.userSection}>
                <div style={{ padding: '12px 16px', borderTop: '0.5px solid #1a3a24', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#0f2e1a', border: '0.5px solid #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#1D9E75', fontWeight: '500', flexShrink: 0 }}>
                    {user?.username?.charAt(0)?.toUpperCase() || 'T'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username || 'Trader'}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(159,225,203,0.4)', textTransform: 'capitalize' }}>Plan {plan}</div>
                  </div>
                </div>
                
                <a
                  href="https://app.travitrade.com/dashboard"
                  className={styles.changeModuleBtn}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M8 7H2M4 5L2 7L4 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Volver a la App
                </a>

                <button className={styles.logoutBtn} onClick={handleLogout}>
                    <LogOut size={18} /> CERRAR SESIÓN
                </button>
            </div>
            </aside>
        </>
    );
}
