import React, { useState } from 'react';
import api from '../api';

const PedidoTable = ({
  pedidos,
  tipo,
  setPedidos,
  setPedidosAndamento,
  setPedidosConcluidos,
  setMensagem,
  setMostrarModal,
  setPedidoSelecionado,
  setMostrarModalPesoVolume,
  setPedidoParaConcluir,
  busca,
  carregarPedidos,
  moverParaAndamento,
  pausarPedido,
  retomarPedido,
  formatarTempo, // Recebendo a função como prop
}) => {
  const [expandedRows, setExpandedRows] = useState([]);

  const formatDateToLocalISO = (date) => {
    const d = date ? new Date(date) : new Date();
    if (isNaN(d)) {
      return new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 19);
    }
    return d.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 19);
  };

  const formatarData = (data) => {
    if (!data || typeof data !== 'string') {
      console.warn('Data inválida em formatarData:', data);
      return 'Não informado';
    }
    const parsedDate = new Date(data.includes(' ') ? data : `${data}T00:00:00`);
    if (isNaN(parsedDate)) {
      console.warn('Data inválida em formatarData após parse:', data);
      return 'Não informado';
    }
    return parsedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatarDataHora = (data) => {
    if (!data || typeof data !== 'string' || data.includes('undefined')) {
      return 'Não informado';
    }
    return new Date(data).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };

  const logAndRender = (label, value, fallback = 'Não informado') => {
    console.log(label, value);
    return value || fallback;
  };

  const excluirPedido = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este pedido?')) {
      try {
        await api.delete(`/pedidos/${id}`);
        setPedidos((prev) => prev.filter((p) => p.id !== id));
        setPedidosAndamento((prev) => prev.filter((p) => p.id !== id));
        setPedidosConcluidos((prev) => prev.filter((p) => p.id !== id));
        setMensagem('Pedido excluído com sucesso!');
      } catch (error) {
        setMensagem('Erro ao excluir pedido: ' + error.message);
      }
    }
  };

  const concluirPedido = (id) => {
    const pedidoAndamento = pedidos.find((p) => p.id === id);
    if (!pedidoAndamento) {
      setMensagem('Erro: Pedido não encontrado para conclusão.');
      return;
    }
    const inicioValido = pedidoAndamento.inicio && !pedidoAndamento.inicio.includes('undefined')
      ? formatDateToLocalISO(pedidoAndamento.inicio)
      : formatDateToLocalISO(new Date());
    const pedidoParaConcluirAtualizado = {
      ...pedidoAndamento,
      inicio: inicioValido,
    };
    setPedidoParaConcluir(pedidoParaConcluirAtualizado);
    setMostrarModalPesoVolume(true);
  };

  const editarQuantidadeEntregue = (id) => {
    const pedidoAndamento = pedidos.find((p) => p.id === id);
    if (!pedidoAndamento) {
      setMensagem('Erro: Pedido não encontrado para edição.');
      return;
    }
    const inicioValido = pedidoAndamento.inicio && !pedidoAndamento.inicio.includes('undefined')
      ? formatDateToLocalISO(pedidoAndamento.inicio)
      : formatDateToLocalISO(new Date());
    const pedidoParaConcluirAtualizado = {
      ...pedidoAndamento,
      inicio: inicioValido,
      itemParaEditar: true,
    };
    setPedidoParaConcluir(pedidoParaConcluirAtualizado);
    setMostrarModalPesoVolume(true);
  };

  const abrirModalObservacao = (pedido) => {
    setPedidoSelecionado(pedido);
    setMostrarModal(true);
  };

  const isPastDue = (previsaoEntrega) => {
    if (!previsaoEntrega) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(previsaoEntrega);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today && tipo !== 'concluido';
  };

  const filtrarPedidos = (lista) => {
    if (!busca) return lista;
    return lista.filter((pedido) =>
      pedido.empresa.toLowerCase().includes(busca.toLowerCase()) ||
      pedido.numeroOS.toLowerCase().includes(busca.toLowerCase())
    );
  };

  const headers = {
    andamento: ['Empresa', 'Nº OS', 'Data Entrada', 'Previsão\nEntrega', 'Responsável', 'Início', 'Tempo', 'Ações'],
    novo: ['Empresa', 'Nº OS', 'Data Entrada', 'Previsão\nEntrega', 'Responsável', 'Início', 'Tempo', 'Ações'],
    concluido: ['Empresa', 'Nº OS', 'Data Entrada', 'Previsão\nEntrega', 'Responsável', 'Início e\nConclusão', 'Tempo', 'Ações'],
  };

  const toggleExpand = (id) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  return (
    <table className={`tabela ${tipo === 'novo' ? 'novos' : ''}`}>
      <thead>
        <tr>
          {headers[tipo].map((header, index) => (
            <th key={index}>{header.split('\n').map((line, i) => (
              <React.Fragment key={i}>{line}<br /></React.Fragment>
            ))}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filtrarPedidos(pedidos).map((pedido) => (
          <React.Fragment key={pedido.id}>
            <tr className={isPastDue(pedido.previsaoEntrega) ? 'atrasado' : ''}>
              <td>{logAndRender('empresa:', pedido.empresa)}</td>
              <td>{logAndRender('numeroOS:', pedido.numeroOS)}</td>
              <td>{logAndRender('dataEntrada:', pedido.dataEntrada, formatarData(pedido.dataEntrada))}</td>
              <td>
                {logAndRender('previsaoEntrega:', pedido.previsaoEntrega, formatarData(pedido.previsaoEntrega))}
                {isPastDue(pedido.previsaoEntrega) && <span className="atrasado-icon">⚠️</span>}
              </td>
              <td>{logAndRender('responsavel:', pedido.responsavel)}</td>
              <td className="data-hora">
                {tipo === 'concluido' ? (
                  <>
                    {logAndRender('inicio:', pedido.inicio, formatarDataHora(pedido.inicio)) || 'Não informado'}<br />
                    {logAndRender('dataConclusao:', pedido.dataConclusao, formatarDataHora(pedido.dataConclusao)) || 'Não concluído'}
                  </>
                ) : (
                  logAndRender('inicio:', pedido.inicio, formatarDataHora(pedido.inicio))
                )}
              </td>
              <td className={tipo === 'andamento' && pedido.pausado ? 'tempo-pausado' : ''}>
                {formatarTempo(pedido.tempo)}
                {tipo === 'andamento' && (
                  <button
                    className={pedido.pausado ? 'btn-retomar' : 'btn-pausar'}
                    onClick={() => pedido.pausado ? retomarPedido(pedido.id) : pausarPedido(pedido.id)}
                  >
                    {pedido.pausado ? 'Retomar' : 'Pausar'}
                  </button>
                )}
              </td>
              <td>
                <div className="btn-container">
                  <div className="btn-row">
                    {tipo === 'andamento' && (
                      <button className="btn-concluir" onClick={() => concluirPedido(pedido.id)}>Concluir</button>
                    )}
                    {tipo === 'novo' && (
                      <button className="btn-mover" onClick={() => moverParaAndamento(pedido.id)}>Andamento</button>
                    )}
                    {tipo === 'andamento' && (
                      <button className="btn-editar" onClick={() => editarQuantidadeEntregue(pedido.id)}>Editar</button>
                    )}
                    <button className="btn-excluir" onClick={() => excluirPedido(pedido.id)}>Excluir</button>
                  </div>
                  <div className="btn-row">
                    <button className="btn-observacao" onClick={() => abrirModalObservacao(pedido)}>Obs</button>
                    <button className="btn-expandir" onClick={() => toggleExpand(pedido.id)}>
                      {expandedRows.includes(pedido.id) ? 'Recolher' : 'Expandir'}
                    </button>
                  </div>
                </div>
              </td>
            </tr>
            {expandedRows.includes(pedido.id) && (
              <tr>
                <td colSpan={8}>
                  <table className="tabela-itens">
                    <thead>
                      <tr>
                        <th>Código do Desenho</th>
                        <th>Quantidade Pedida</th>
                        <th>Quantidade Entregue</th>
                        <th>Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedido.itens && pedido.itens.length > 0 ? (
                        pedido.itens.map((item, idx) => {
                          const qtdPedido = parseInt(item.quantidadePedido, 10) || 0;
                          const qtdEntregue = parseInt(item.quantidadeEntregue, 10) || 0;
                          const saldo = qtdPedido - qtdEntregue;
                          console.log('Item:', item, 'qtdPedido:', qtdPedido, 'qtdEntregue:', qtdEntregue, 'Saldo:', saldo);
                          return (
                            <tr key={idx}>
                              <td>{item.codigoDesenho || 'Não informado'}</td>
                              <td>{qtdPedido}</td>
                              <td>{qtdEntregue}</td>
                              <td>{isNaN(saldo) ? '0' : saldo}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="4">Nenhum item encontrado</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

export default PedidoTable;