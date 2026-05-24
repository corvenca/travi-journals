import Sidebar from '@/components/Sidebar'
import MarketTicker from '@/components/MarketTicker'

export default function TradingLayout({ children }) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                <MarketTicker />
                <div style={{ flex: 1 }}>
                    {children}
                </div>
            </main>
        </div>
    )
}
