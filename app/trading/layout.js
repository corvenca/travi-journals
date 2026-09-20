'use client';
import Sidebar from '@/components/Sidebar'
import MarketTicker from '@/components/MarketTicker'
import PlanGuard from '@/components/PlanGuard'

export default function TradingLayout({ children }) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                <MarketTicker />
                <div style={{ flex: 1 }}>
                    <PlanGuard>
                        {children}
                    </PlanGuard>
                </div>
            </main>
        </div>
    )
}
