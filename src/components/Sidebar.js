import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiInbox, FiClock, FiCheckCircle, FiFileText, FiLogOut, FiX } from 'react-icons/fi';

const Sidebar = ({ counts, onNavigateAndamento, onLogout, isOpen, onClose }) => {
  const navigate = useNavigate();

  const irParaHome = () => {
    navigate('/');
    onClose();
  };

  const irParaNovos = () => {
    navigate('/pedidos/novos');
    onClose();
  };

  const irParaAndamento = () => {
    navigate('/');
    onNavigateAndamento();
    onClose();
  };

  const irParaConcluidos = () => {
    navigate('/pedidos/concluidos');
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
        <button className="sidebar-brand" onClick={irParaHome}>
          <img src="/logoNF.jpg" alt="Logo" className="sidebar-logo" />
          <span>Controle de Produção</span>
          <span
            className="sidebar-close"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            role="button"
            tabIndex={0}
            aria-label="Fechar menu"
          >
            <FiX />
          </span>
        </button>

        <nav className="sidebar-nav">
          <span className="sidebar-nav-title">Painel</span>
          <button className="sidebar-nav-item" onClick={irParaNovos}>
            <FiInbox /> <span>Novos</span>
            <span className="sidebar-badge">{counts.novo ?? 0}</span>
          </button>
          <button className="sidebar-nav-item" onClick={irParaAndamento}>
            <FiClock /> <span>Em Andamento</span>
            <span className="sidebar-badge">{counts.andamento ?? 0}</span>
          </button>
          <button className="sidebar-nav-item" onClick={irParaConcluidos}>
            <FiCheckCircle /> <span>Concluídos</span>
            <span className="sidebar-badge">{counts.concluido ?? 0}</span>
          </button>
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
