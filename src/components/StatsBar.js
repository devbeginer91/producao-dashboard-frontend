import React from 'react';
import { FiInbox, FiClock, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import { isPastDue } from '../utils';

const StatsBar = ({ novos, andamento, concluidos }) => {
  const atrasados = [...novos, ...andamento].filter((p) => isPastDue(p.previsaoEntrega, p.status)).length;

  const tiles = [
    { label: 'Novos', value: novos.length, icon: FiInbox, tone: 'info' },
    { label: 'Em Andamento', value: andamento.length, icon: FiClock, tone: 'accent' },
    { label: 'Concluídos', value: concluidos.length, icon: FiCheckCircle, tone: 'success' },
    { label: 'Atrasados', value: atrasados, icon: FiAlertTriangle, tone: 'danger' },
  ];

  return (
    <div className="stats-bar">
      {tiles.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className="stat-card">
          <span className={`stat-icon stat-icon-${tone}`}>
            <Icon />
          </span>
          <div className="stat-card-body">
            <span className="stat-value">{value}</span>
            <span className="stat-label">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;
