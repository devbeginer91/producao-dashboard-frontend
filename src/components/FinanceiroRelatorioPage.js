import React, { useEffect, useState } from 'react';
import { FiMenu, FiDollarSign, FiDownload } from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';
import { formatarDataHora } from '../utils';
import DesenhosVinculadosModal from './DesenhosVinculadosModal';
import OsCardModal from './OsCardModal';
import PieChart from './PieChart';

const formatarMoeda = (valor) =>
  (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Ordem fixa das cores categóricas — nunca reatribuir por posição/ranking dos clientes.
const CORES_PIZZA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
const COR_OUTROS = '#94a3b8';
const MAX_FATIAS = 5;

// Top 5 clientes + "Outros" — mantém a pizza legível (soft cap de 5-6 fatias).
const montarDadosPizza = (porCliente) => {
  const comValor = porCliente.filter((c) => c.total > 0);
  const principais = comValor.slice(0, MAX_FATIAS).map((c, i) => ({
    label: c.empresa,
    valor: c.total,
    cor: CORES_PIZZA[i],
  }));
  const restante = comValor.slice(MAX_FATIAS);
  if (restante.length > 0) {
    principais.push({
      label: 'Outros',
      valor: restante.reduce((soma, c) => soma + c.total, 0),
      cor: COR_OUTROS,
    });
  }
  return principais;
};

const FinanceiroRelatorioPage = ({ setSidebarOpen }) => {
  const [cliente, setCliente] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [clientesDisponiveis, setClientesDisponiveis] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [desenhosModalItem, setDesenhosModalItem] = useState(null);
  const [osCardAbertaId, setOsCardAbertaId] = useState(null);

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

  const emitirPdfRelatorio = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Relatório de Faturamento', 14, 18);
    doc.setFontSize(10);
    doc.text(`Cliente: ${cliente || 'Todos os clientes'}`, 14, 26);
    doc.text(`Período: ${inicio || '—'} até ${fim || '—'}`, 14, 32);
    doc.text(`Total faturado: ${formatarMoeda(relatorio.totalFaturado)}`, 14, 38);

    let proximoY = 44;

    if (!cliente && relatorio.porCliente.length > 1) {
      doc.setFontSize(12);
      doc.text('Total por Cliente', 14, proximoY + 4);
      autoTable(doc, {
        head: [['Cliente', 'Total Faturado']],
        body: relatorio.porCliente.map((c) => [c.empresa, formatarMoeda(c.total)]),
        startY: proximoY + 8,
        styles: { fontSize: 9 },
      });
      proximoY = doc.lastAutoTable.finalY + 10;
    }

    doc.setFontSize(12);
    doc.text('Itens Faturados', 14, proximoY + 4);
    autoTable(doc, {
      head: [['Data', 'Cliente', 'OC Cliente', 'OS DCA', 'Item', 'Qtd.', 'Status', 'Valor Faturado']],
      body: relatorio.itens.map((item) => [
        formatarDataHora(item.dataFaturamento),
        item.empresa,
        item.ocCliente || '—',
        item.numeroOS,
        item.codigoDesenho,
        `${item.quantidadeFaturada} de ${item.quantidadePedido}`,
        item.parcial ? 'Parcial' : 'Completo',
        formatarMoeda(item.valorFaturado),
      ]),
      startY: proximoY + 8,
      styles: { fontSize: 8, cellWidth: 'wrap' },
    });

    const nomeArquivo = `relatorio_faturamento_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(nomeArquivo);
  };

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
          <button type="button" className="btn-exportar-pdf" onClick={emitirPdfRelatorio}>
            <FiDownload /> Exportar PDF
          </button>

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
              <PieChart
                titulo="Faturado por Cliente"
                dados={montarDadosPizza(relatorio.porCliente)}
                formatarValor={formatarMoeda}
              />

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
                  <th>Status</th>
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
                    <td>
                      <button type="button" className="btn-os-clicavel" onClick={() => setOsCardAbertaId(item.pedidoId)}>
                        {item.numeroOS}
                      </button>
                    </td>
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
                    <td>{item.quantidadeFaturada} de {item.quantidadePedido}</td>
                    <td>
                      {item.parcial ? (
                        <span className="financeiro-badge-parcial">Parcial</span>
                      ) : (
                        <span className="financeiro-badge-completo">Completo</span>
                      )}
                    </td>
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

      {osCardAbertaId && (
        <OsCardModal pedidoId={osCardAbertaId} onClose={() => setOsCardAbertaId(null)} />
      )}
    </>
  );
};

export default FinanceiroRelatorioPage;
