import React, { useEffect, useRef } from 'react';

// Widget oficial do TradingView (Single Ticker), carregado via script deles — não dá pra
// converter pra Reais aqui dentro, o valor vem em USD (cobre é cotado em dólar no COMEX).
const CobreTicker = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    // Guarda contra o double-effect do StrictMode em dev: o script do TradingView reage a
    // um postMessage assíncrono do iframe, e se o container for limpo/reinjetado entre o
    // primeiro e o segundo mount ele quebra tentando achar um elemento que já sumiu.
    if (!container || container.childElementCount > 0) return;

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: 'OANDA:XCUUSD',
      width: 170,
      height: 80,
      colorTheme: 'light',
      isTransparent: true,
      locale: 'br',
    });

    container.appendChild(widgetDiv);
    container.appendChild(script);
  }, []);

  return (
    <div className="cobre-ticker-container">
      <div className="tradingview-widget-container" ref={containerRef} />
    </div>
  );
};

export default CobreTicker;
