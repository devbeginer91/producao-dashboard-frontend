import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiInbox, FiClock, FiCheckCircle, FiFileText, FiUpload, FiStar, FiZap, FiActivity, FiLogOut, FiX, FiUsers, FiTrendingUp, FiDollarSign, FiBarChart2 } from 'react-icons/fi';

const Sidebar = ({ isAdmin, counts, onNavigateAndamento, onLogout, isOpen, onClose }) => {
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

  const irParaImportarChicotes = () => {
    navigate('/importar-chicotes');
    onClose();
  };

  const irParaPriorizarProducao = () => {
    navigate('/priorizar-producao');
    onClose();
  };

  const irParaChicotesEletricos = () => {
    navigate('/chicotes-eletricos');
    onClose();
  };

  const irParaAcompanhamentoProducao = () => {
    navigate('/acompanhamento-producao');
    onClose();
  };

  const irParaRelatorioColaboradores = () => {
    navigate('/relatorios/colaboradores');
    onClose();
  };

  const irParaRelatorioChicotes = () => {
    navigate('/relatorios/chicotes');
    onClose();
  };

  const irParaFinanceiro = () => {
    navigate('/financeiro');
    onClose();
  };

  const irParaRelatorioFaturamento = () => {
    navigate('/financeiro-relatorio');
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

        <nav className="sidebar-nav">
          <span className="sidebar-nav-title">Produção</span>
          <button className="sidebar-nav-item" onClick={irParaPriorizarProducao}>
            <FiStar /> <span>Priorizar Produção</span>
          </button>
          <button className="sidebar-nav-item" onClick={irParaChicotesEletricos}>
            <FiZap /> <span>Chicotes Elétricos</span>
          </button>
          <button className="sidebar-nav-item" onClick={irParaAcompanhamentoProducao}>
            <FiActivity /> <span>Acompanhar Produção</span>
          </button>
        </nav>

        {isAdmin && (
          <nav className="sidebar-nav">
            <span className="sidebar-nav-title">Financeiro</span>
            <button className="sidebar-nav-item" onClick={irParaFinanceiro}>
              <FiDollarSign /> <span>Financeiro</span>
            </button>
            <button className="sidebar-nav-item" onClick={irParaRelatorioFaturamento}>
              <FiBarChart2 /> <span>Relatório de Faturamento</span>
            </button>
          </nav>
        )}

        <nav className="sidebar-nav">
          <span className="sidebar-nav-title">Relatórios</span>
          <button className="sidebar-nav-item" onClick={irParaRelatorioColaboradores}>
            <FiUsers /> <span>Tempos por Colaborador</span>
          </button>
          <button className="sidebar-nav-item" onClick={irParaRelatorioChicotes}>
            <FiTrendingUp /> <span>Tempos por Chicote</span>
          </button>
        </nav>

        {isAdmin && (
          <nav className="sidebar-nav">
            <span className="sidebar-nav-title">Administração</span>
            <button className="sidebar-nav-item" onClick={irParaImportarChicotes}>
              <FiUpload /> <span>Importar Arquivos</span>
            </button>
          </nav>
        )}

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
