import React, { useState } from 'react';
import axios from 'axios';

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
    return data ? new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Não informado';
  };

  const formatarDataHora = (data) => {
    if (!data || typeof data !== 'string' || data.includes('undefined')) {
      return 'Não informado';
    }
    return new Date(data).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };

  const excluirPedido = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este pedido?')) {
      try {
        await axios.delete(`http://localhost:5000/pedidos/${id}`);
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
              <td>{pedido.empresa}</td>
              <td>{pedido.numeroOS}</td>
              <td>{formatarData(pedido.dataEntrada)}</td>
              <td>
                {formatarData(pedido.previsaoEntrega)}
                {isPastDue(pedido.previsaoEntrega) && <span className="atrasado-icon">⚠️</span>}
              </td>
              <td>{pedido.responsavel}</td>
              <td className="data-hora">
                {tipo === 'concluido' ? (
                  <>
                    {formatarDataHora(pedido.inicio) || 'Não informado'}<br />
                    {formatarDataHora(pedido.dataConclusao) || 'Não concluído'}
                  </>
                ) : (
                  formatarDataHora(pedido.inicio)
                )}
              </td>
              <td className={tipo === 'andamento' && pedido.pausado ? 'tempo-pausado' : ''}>
                {formatarTempo(pedido.tempo)} {/* Usando a função passada como prop */}
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
                      {pedido.itens.map((item) => (
                        <tr key={item.id}>
                          <td>{item.codigoDesenho}</td>
                          <td>{item.quantidadePedido}</td>
                          <td>{item.quantidadeEntregue}</td>
                          <td>{item.quantidadePedido - item.quantidadeEntregue}</td>
                        </tr>
                      ))}
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