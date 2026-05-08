import Sidebar from '@/components/Sidebar'


export default function TradingLayout({ children }) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, overflow: 'auto' }}>
                {children}
            </main>
        </div>
    )
}
