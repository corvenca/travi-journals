'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import styles from './layout.module.css';

import { AccountProvider } from '@/components/trading/AccountContext';

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const isLogin = pathname === '/login';
    const isSeleccionModulo = pathname === '/seleccionar-modulo';
    const hideSidebar = isLogin || isSeleccionModulo;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <AccountProvider>
            <div className={styles.container}>
                {!hideSidebar && <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />}
                <div className={hideSidebar ? styles.mainLoginWrapper : styles.mainWrapper}>
                    {!hideSidebar && <Header isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />}
                    <main className={styles.content}>
                        {children}
                    </main>
                </div>
            </div>
        </AccountProvider>
    );
}
