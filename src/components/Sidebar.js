import React from 'react';
import { FiInbox, FiClock, FiCheckCircle, FiFileText, FiLogOut, FiX } from 'react-icons/fi';

const NAV_ITEMS = [
  { tipo: 'novo', label: 'Novos', icon: FiInbox },
  { tipo: 'andamento', label: 'Em Andamento', icon: FiClock },
  { tipo: 'concluido', label: 'Concluídos', icon: FiCheckCircle },
];

const Sidebar = ({ counts, onNavigate, onLogout, isOpen, onClose }) => {
  const handleNavigate = (tipo) => {
    onNavigate(tipo);
    onClose();
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logoNF.jpg" alt="Logo" className="sidebar-logo" />
          <span>Controle de Produção</span>
          <button className="sidebar-close" onClick={onClose} aria-label="Fechar menu">
            <FiX />
          </button>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-nav-title">Painel</span>
          {NAV_ITEMS.map(({ tipo, label, icon: Icon }) => (
            <button key={tipo} className="sidebar-nav-item" onClick={() => handleNavigate(tipo)}>
              <Icon /> <span>{label}</span>
              <span className="sidebar-badge">{counts[tipo] ?? 0}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-nav-item"
            onClick={() => window.open('https://drive.google.com/drive/folders/1vzemVbLeotHD0xirxUPsvNb9qBccQFcd?usp=sharing', '_blank')}
          >
            <FiFileText /> <span>Desenhos</span>
          </button>
          <button className="sidebar-nav-item sidebar-logout" onClick={onLogout}>
            <FiLogOut /> <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
