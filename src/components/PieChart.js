import React from 'react';

// Doughnut construído com stroke-dasharray sobre um círculo — evita cálculo de arco em path.
const RAIO = 40;
const CENTRO = 50;
const ESPESSURA = 20;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
const GAP = 3; // pequeno respiro entre fatias, em unidades do viewBox

const PieChart = ({ dados, formatarValor, titulo }) => {
  const total = dados.reduce((soma, d) => soma + d.valor, 0);
  if (total <= 0) return null;

  let acumulado = 0;
  const fatias = dados.map((d) => {
    const fracao = d.valor / total;
    const comprimento = Math.max(fracao * CIRCUNFERENCIA - GAP, 0);
    const inicio = acumulado;
    acumulado += fracao * CIRCUNFERENCIA;
    return { ...d, fracao, comprimento, offset: -inicio, inicio };
  });

  return (
    <div className="pizza-card">
      {titulo && <h3 className="pizza-titulo">{titulo}</h3>}
      <div className="pizza-corpo">
        <svg viewBox="0 0 100 100" className="pizza-svg" role="img" aria-label={titulo}>
          <g transform={`rotate(-90 ${CENTRO} ${CENTRO})`}>
            {fatias.map((f) => (
              <circle
                key={f.label}
                cx={CENTRO}
                cy={CENTRO}
                r={RAIO}
                fill="none"
                stroke={f.cor}
                strokeWidth={ESPESSURA}
                strokeDasharray={`${f.comprimento} ${CIRCUNFERENCIA - f.comprimento}`}
                strokeDashoffset={f.offset}
                className="pizza-fatia"
              >
                <title>{`${f.label}: ${formatarValor(f.valor)} (${(f.fracao * 100).toFixed(1)}%)`}</title>
              </circle>
            ))}
          </g>
          {fatias
            .filter((f) => f.fracao >= 0.08)
            .map((f) => {
              const anguloCentral = ((f.inicio + f.comprimento / 2) / CIRCUNFERENCIA) * 360 - 90;
              const rad = (anguloCentral * Math.PI) / 180;
              const raioLabel = RAIO;
              const x = CENTRO + raioLabel * Math.cos(rad);
              const y = CENTRO + raioLabel * Math.sin(rad);
              return (
                <text
                  key={f.label}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pizza-label"
                >
                  {(f.fracao * 100).toFixed(0)}%
                </text>
              );
            })}
        </svg>

        <ul className="pizza-legenda">
          {dados.map((d) => (
            <li key={d.label} className="pizza-legenda-item">
              <span className="pizza-legenda-swatch" style={{ background: d.cor }} />
              <span className="pizza-legenda-label">{d.label}</span>
              <span className="pizza-legenda-valor">{formatarValor(d.valor)}</span>
              <span className="pizza-legenda-pct">{((d.valor / total) * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PieChart;
