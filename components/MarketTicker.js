'use client';
import { useEffect, useRef } from 'react';

export default function MarketTicker() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'CAPITALCOM:US100', title: 'Nasdaq 100' },
        { proName: 'CAPITALCOM:US500', title: 'S&P 500' },
        { proName: 'CAPITALCOM:US30', title: 'Dow Jones' },
        { proName: 'CAPITALCOM:GOLD', title: 'Oro' },
        { proName: 'TVC:USOIL', title: 'Petróleo WTI' },
        { proName: 'CAPITALCOM:SILVER', title: 'Plata' },
        { proName: 'CAPITALCOM:NATURALGAS', title: 'Gas Natural' },
        { proName: 'FX:EURUSD', title: 'EUR/USD' },
        { proName: 'FX:GBPUSD', title: 'GBP/USD' },
        { proName: 'FX:USDJPY', title: 'USD/JPY' },
        { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
        { proName: 'BITSTAMP:ETHUSD', title: 'Ethereum' },
        { proName: 'NASDAQ:AAPL', title: 'Apple' },
        { proName: 'NASDAQ:TSLA', title: 'Tesla' },
        { proName: 'NASDAQ:NVDA', title: 'Nvidia' },
        { proName: 'NASDAQ:MSFT', title: 'Microsoft' },
        { proName: 'NASDAQ:AMZN', title: 'Amazon' },
        { proName: 'NASDAQ:META', title: 'Meta' },
        { proName: 'NASDAQ:GOOGL', title: 'Google' },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: 'dark',
      locale: 'es'
    });

    const container = document.createElement('div');
    container.className = 'tradingview-widget-container__widget';
    containerRef.current.appendChild(container);
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{
        background: '#0a1a0f',
        borderBottom: '0.5px solid #1a3a24',
        width: '100%',
        minHeight: '46px'
      }}
    />
  );
}
