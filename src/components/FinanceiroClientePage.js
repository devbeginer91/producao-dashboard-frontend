import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiMenu, FiArrowLeft, FiPlus, FiCheckCircle, FiZap, FiDollarSign, FiEdit2 } from 'react-icons/fi';
import api from '../api';
import { formatarDataHora } from '../utils';

const formatarData = (data) => {
  if (!data || typeof data !== 'string' || data.includes('undefined')) {
    return '—';
  }
  const parsedDate = new Date(data.includes(' ') ? data : `${data}T00:00:00`);
  if (isNaN(parsedDate)) {
    return '—';
  }
  return parsedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatarMoeda = (valor) =>
  (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FinanceiroClientePage = ({ setSidebarOpen, mostrarFormulario, setMostrarFormulario, setNovoPedido, setPedidoParaEditar, formatDateToLocalISO }) => {
  const { cliente } = useParams();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [faturando, setFaturando] = useState({});

  const carregar = () => {
    setCarregando(true);
    api.get('/pedidos', { params: { empresa: cliente } })
      .then((r) => setPedidos(r.data))
      .catch((e) => setMensagem('Erro: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line
  }, [cliente]);

  // O formulário de pedido (Cadastrar/Editar) vive fora dessa página; ao fechar o drawer,
  // recarrega pra refletir o que acabou de ser salvo (a OS pode já existir, ter sido editada, etc).
  useEffect(() => {
    if (!mostrarFormulario) {
      carregar();
    }
    // eslint-disable-next-line
  }, [mostrarFormulario]);

  const cadastrarPedido = () => {
    const inicioInicial = formatDateToLocalISO(new Date(), 'financeiro cadastrar pedido');
    setNovoPedido({
      empresa: cliente,
      numeroOS: '',
      dataEntrada: '',
      previsaoEntrega: '',
      responsavel: '',
      ocCliente: '',
      status: 'novo',
      inicio: inicioInicial,
      tempo: 0,
      itens: [{ codigoDesenho: '', quantidadePedido: '' }],
    });
    setMostrarFormulario(true);
  };

  const faturar = async (item) => {
    setFaturando((prev) => ({ ...prev, [item.id]: true }));
    try {
      await api.put(`/itens-pedidos/${item.id}/faturar`);
      carregar();
    } catch (error) {
      setMensagem('Erro ao faturar: ' + (error.response?.data?.message || error.message));
      setFaturando((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const editarPedido = (pedidoId) => {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return;
    setPedidoParaEditar(pedido);
    setNovoPedido({
      ...pedido,
      itens: (pedido.itens || []).map((item) => ({
        ...item,
        quantidadePedido: item.quantidadePedido != null ? item.quantidadePedido.toString() : '',
      })),
    });
    setMostrarFormulario(true);
  };

  // Achata pedidos -> itens (todos, com ou sem valor cadastrado), carregando os dados do pedido junto.
  const linhas = [];
  pedidos.forEach((pedido) => {
    (pedido.itens || []).forEach((item) => {
      linhas.push({
        ...item,
        pedidoId: pedido.id,
        numeroOS: pedido.numeroOS,
        ocCliente: pedido.ocCliente,
        dataEntrada: pedido.dataEntrada,
        previsaoEntrega: pedido.previsaoEntrega,
      });
    });
  });

  const porOSDecrescente = (a, b) => {
    const osA = parseInt(a.numeroOS, 10);
    const osB = parseInt(b.numeroOS, 10);
    if (!isNaN(osA) && !isNaN(osB) && osA !== osB) return osB - osA;
    return String(b.numeroOS).localeCompare(String(a.numeroOS));
  };

  const itensAberto = linhas.filter((l) => !l.faturado).sort(porOSDecrescente);
  const itensFaturados = linhas.filter((l) => l.faturado).sort(porOSDecrescente);
  const valorEmAberto = itensAberto.reduce(
    (soma, item) => soma + (item.valorUnitario != null ? item.valorUnitario * (item.quantidadePedido || 0) : 0),
    0
  );

  return (
    <>
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>{cliente}</h1>
        <button className="btn-adicionar-pedido" onClick={cadastrarPedido}>
          <FiPlus /> Cadastrar Pedido
        </button>
      </header>

      <button className="op-voltar" onClick={() => navigate('/financeiro')}>
        <FiArrowLeft /> Voltar ao Financeiro
      </button>

      {mensagem && <p className="erro">{mensagem}</p>}
      {carregando && <p className="loading">Carregando pedidos...</p>}

      {!carregando && (
        <>
          <div className="stats-bar">
            <div className="stat-card">
              <span className="stat-icon stat-icon-accent">
                <FiDollarSign />
              </span>
              <div className="stat-card-body">
                <span className="stat-value">{formatarMoeda(valorEmAberto)}</span>
                <span className="stat-label">Valor em aberto</span>
              </div>
            </div>
          </div>

          <h2 className="op-detalhe-titulo secao-titulo">Itens em Aberto</h2>
          {itensAberto.length === 0 ? (
            <p className="pedido-grid-empty">Nenhum item em aberto pra esse cliente.</p>
          ) : (
            <table className="tabela-itens">
              <thead>
                <tr>
                  <th>Data Entrada</th>
                  <th>OC Cliente</th>
                  <th>OS DCA</th>
                  <th>Item</th>
                  <th>Quantidade</th>
                  <th>Valor</th>
                  <th>Valor Total</th>
                  <th>Saldo</th>
                  <th>Previsão de Entrega</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {itensAberto.map((item) => {
                  const temValor = item.valorUnitario != null;
                  const prontoParaFaturar = temValor && (item.quantidadeEntregue || 0) > 0;
                  const saldo = (item.quantidadePedido || 0) - (item.quantidadeEntregue || 0);
                  return (
                    <tr key={item.id} className={prontoParaFaturar ? 'financeiro-item-pronto' : ''}>
                      <td>{formatarData(item.dataEntrada)}</td>
                      <td>{item.ocCliente || '—'}</td>
                      <td>{item.numeroOS}</td>
                      <td>{item.codigoDesenho}</td>
                      <td>{item.quantidadePedido}</td>
                      <td>{temValor ? formatarMoeda(item.valorUnitario) : '—'}</td>
                      <td>{temValor ? formatarMoeda(item.valorUnitario * (item.quantidadePedido || 0)) : '—'}</td>
                      <td>{saldo}</td>
                      <td>{formatarData(item.previsaoEntrega)}</td>
                      <td className="financeiro-acoes-cell">
                        <button
                          type="button"
                          className="btn-editar financeiro-btn-editar"
                          onClick={() => editarPedido(item.pedidoId)}
                          title="Editar pedido (OC, valores, itens)"
                        >
                          <FiEdit2 />
                        </button>
                        {prontoParaFaturar ? (
                          <button
                            type="button"
                            className="btn-editar financeiro-btn-faturar"
                            onClick={() => faturar(item)}
                            disabled={faturando[item.id]}
                            title={`Pronto pra faturar: ${item.quantidadeEntregue} unidade(s) já entregue(s)`}
                          >
                            <FiZap className="financeiro-alerta-icon" /> Faturado
                          </button>
                        ) : !temValor ? (
                          <span className="financeiro-sem-entrega">Sem valor cadastrado</span>
                        ) : (
                          <span className="financeiro-sem-entrega">Aguardando entrega</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <h2 className="op-detalhe-titulo secao-titulo">Itens Faturados</h2>
          {itensFaturados.length === 0 ? (
            <p className="pedido-grid-empty">Nenhum item faturado ainda.</p>
          ) : (
            <table className="tabela-itens">
              <thead>
                <tr>
                  <th>Data Entrada</th>
                  <th>OC Cliente</th>
                  <th>OS DCA</th>
                  <th>Item</th>
                  <th>Quantidade Faturada</th>
                  <th>Valor</th>
                  <th>Valor Faturado</th>
                  <th>Data Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {itensFaturados.map((item) => (
                  <tr key={item.id}>
                    <td>{formatarData(item.dataEntrada)}</td>
                    <td>{item.ocCliente || '—'}</td>
                    <td>{item.numeroOS}</td>
                    <td>{item.codigoDesenho}</td>
                    <td>{item.quantidadeEntregue}</td>
                    <td>{formatarMoeda(item.valorUnitario)}</td>
                    <td><FiCheckCircle className="financeiro-faturado-icon" /> {formatarMoeda(item.valorFaturado)}</td>
                    <td>{formatarDataHora(item.dataFaturamento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
};

export default FinanceiroClientePage;
