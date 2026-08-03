import React, { useEffect, useState } from 'react';
import { FiMenu, FiDollarSign } from 'react-icons/fi';
import api from '../api';
import { formatarDataHora } from '../utils';
import DesenhosVinculadosModal from './DesenhosVinculadosModal';

const formatarMoeda = (valor) =>
  (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FinanceiroRelatorioPage = ({ setSidebarOpen }) => {
  const [cliente, setCliente] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [clientesDisponiveis, setClientesDisponiveis] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [desenhosModalItem, setDesenhosModalItem] = useState(null);

  // Carrega a lista de clientes com faturamento (sem filtro), só uma vez, pro seletor.
  useEffect(() => {
    api.get('/financeiro/relatorio')
      .then((r) => setClientesDisponiveis(r.data.porCliente.map((c) => c.empresa)))
      .catch(() => setClientesDisponiveis([]));
  }, []);

  useEffect(() => {
    setCarregando(true);
    const params = {};
    if (cliente) params.cliente = cliente;
    if (inicio) params.inicio = inicio;
    if (fim) params.fim = fim;
    api.get('/financeiro/relatorio', { params })
      .then((r) => setRelatorio(r.data))
      .catch((e) => setMensagem('Erro: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  }, [cliente, inicio, fim]);

  return (
    <>
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>Relatório de Faturamento</h1>
      </header>

      <div className="chicote-dados-form">
        <div>
          <label htmlFor="filtro-cliente">Cliente</label>
          <select id="filtro-cliente" value={cliente} onChange={(e) => setCliente(e.target.value)}>
            <option value="">Todos os clientes</option>
            {clientesDisponiveis.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-inicio">De</label>
          <input id="filtro-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div>
          <label htmlFor="filtro-fim">Até</label>
          <input id="filtro-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </div>
      </div>

      {mensagem && <p className="erro">{mensagem}</p>}
      {carregando && <p className="loading">Carregando relatório...</p>}

      {!carregando && relatorio && (
        <>
          <div className="stats-bar">
            <div className="stat-card">
              <span className="stat-icon stat-icon-accent">
                <FiDollarSign />
              </span>
              <div className="stat-card-body">
                <span className="stat-value">{formatarMoeda(relatorio.totalFaturado)}</span>
                <span className="stat-label">Total faturado no período</span>
              </div>
            </div>
          </div>

          {!cliente && relatorio.porCliente.length > 1 && (
            <>
              <h2 className="op-detalhe-titulo secao-titulo">Total por Cliente</h2>
              <table className="tabela-itens">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Total Faturado</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.porCliente.map((c) => (
                    <tr key={c.empresa}>
                      <td>{c.empresa}</td>
                      <td>{formatarMoeda(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h2 className="op-detalhe-titulo secao-titulo">Itens Faturados</h2>
          {relatorio.itens.length === 0 ? (
            <p className="pedido-grid-empty">Nenhum item faturado nesse filtro.</p>
          ) : (
            <table className="tabela-itens">
              <thead>
                <tr>
                  <th>Data Faturamento</th>
                  <th>Cliente</th>
                  <th>OC Cliente</th>
                  <th>OS DCA</th>
                  <th>Item</th>
                  <th>Quantidade</th>
                  <th>Valor</th>
                  <th>Valor Faturado</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.itens.map((item) => (
                  <tr key={item.id}>
                    <td>{formatarDataHora(item.dataFaturamento)}</td>
                    <td>{item.empresa}</td>
                    <td>{item.ocCliente || '—'}</td>
                    <td>{item.numeroOS}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-codigo-desenho"
                        onClick={() => setDesenhosModalItem(item)}
                        title="Ver desenhos técnicos vinculados"
                      >
                        {item.codigoDesenho}
                      </button>
                    </td>
                    <td>{item.quantidadeEntregue}</td>
                    <td>{formatarMoeda(item.valorUnitario)}</td>
                    <td>{formatarMoeda(item.valorFaturado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {desenhosModalItem && (
        <DesenhosVinculadosModal
          chicoteId={desenhosModalItem.chicoteId}
          codigoDesenho={desenhosModalItem.codigoDesenho}
          onClose={() => setDesenhosModalItem(null)}
        />
      )}
    </>
  );
};

export default FinanceiroRelatorioPage;
