'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const AccountContext = createContext();

export function AccountProvider({ children }) {
    const [activeAccount, setActiveAccount] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('activeTradingAccount');
        if (stored) {
            try {
                setActiveAccount(JSON.parse(stored));
            } catch (err) {
                console.error("Failed to parse stored active template:", err);
            }
        }
        setIsLoaded(true);
    }, []);

    // Helper to switch account
    const setAccount = (account) => {
        setActiveAccount(account);
        if (account) {
            localStorage.setItem('activeTradingAccount', JSON.stringify(account));
        } else {
            localStorage.removeItem('activeTradingAccount');
        }
    };

    return (
        <AccountContext.Provider value={{ activeAccount, setAccount, isLoaded }}>
            {children}
        </AccountContext.Provider>
    );
}

export function useActiveAccount() {
    return useContext(AccountContext);
}
