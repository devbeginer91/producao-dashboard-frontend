import React, { useState } from 'react';
import api from '../api';
import { formatarDataHora, isPastDue } from '../utils';
import {
  FiCheckCircle,
  FiArrowRightCircle,
  FiEdit2,
  FiTrash2,
  FiMessageSquare,
  FiChevronDown,
  FiChevronUp,
  FiAlertTriangle,
  FiPackage,
  FiStar,
} from 'react-icons/fi';

const formatarData = (data) => {
  if (!data || typeof data !== 'string' || data.includes('undefined')) {
    return 'Não informado';
  }
  const parsedDate = new Date(data.includes(' ') ? data : `${data}T00:00:00`);
  if (isNaN(parsedDate)) {
    return 'Não informado';
  }
  return parsedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const PedidoCard = ({
  pedido,
  tipo,
  setPedidos,
  setPedidosAndamento,
  setPedidosConcluidos,
  setMensagem,
  setMostrarModal,
  setPedidoSelecionado,
  setMostrarModalPesoVolume,
  setPedidoParaConcluir,
  setPedidoParaEditar,
  setNovoPedido,
  setMostrarFormulario,
  moverParaAndamento,
}) => {
  const [expandido, setExpandido] = useState(false);
  const [obsPreview, setObsPreview] = useState(null);
  const [obsPreviewLoading, setObsPreviewLoading] = useState(false);
  const [showObsTooltip, setShowObsTooltip] = useState(false);

  const formatDateToLocalISO = (date) => {
    const d = date ? new Date(date) : new Date();
    if (isNaN(d)) {
      return new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 19);
    }
    return d.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 19);
  };

  const atrasado = isPastDue(pedido.previsaoEntrega, pedido.status);

  const excluirPedido = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este pedido?')) return;
    try {
      await api.delete(`/pedidos/${pedido.id}`);
      setPedidos((prev) => prev.filter((p) => p.id !== pedido.id));
      setPedidosAndamento((prev) => prev.filter((p) => p.id !== pedido.id));
      setPedidosConcluidos((prev) => prev.filter((p) => p.id !== pedido.id));
      setMensagem('Pedido excluído com sucesso!');
    } catch (error) {
      setMensagem('Erro ao excluir pedido: ' + error.message);
    }
  };

  const concluirPedido = () => {
    const inicioValido = pedido.inicio && !pedido.inicio.includes('undefined')
      ? formatDateToLocalISO(pedido.inicio)
      : formatDateToLocalISO(new Date());
    setPedidoParaConcluir({ ...pedido, inicio: inicioValido });
    setMostrarModalPesoVolume(true);
  };

  const editarQuantidadeEntregue = () => {
    const inicioValido = pedido.inicio && !pedido.inicio.includes('undefined')
      ? formatDateToLocalISO(pedido.inicio)
      : formatDateToLocalISO(new Date());
    setPedidoParaConcluir({ ...pedido, inicio: inicioValido, itemParaEditar: true });
    setMostrarModalPesoVolume(true);
  };

  const editarPedidoNovo = () => {
    setPedidoParaEditar(pedido);
    setNovoPedido({ ...pedido, itens: pedido.itens || [{ codigoDesenho: '', quantidadePedido: '' }] });
    setMostrarFormulario(true);
  };

  const abrirModalObservacao = () => {
    setPedidoSelecionado(pedido);
    setMostrarModal(true);
  };

  const temObservacoes = (pedido.observacoesCount || 0) > 0;

  const handleObsHover = () => {
    setShowObsTooltip(true);
    if (obsPreview === null && !obsPreviewLoading) {
      setObsPreviewLoading(true);
      api.get(`/historico-observacoes/${pedido.id}`)
        .then((response) => {
          const historico = Array.isArray(response.data) ? response.data : [];
          setObsPreview(historico.map((obs) => ({
            id: obs.id,
            observacao: obs.observacao,
            dataEdicao: obs.dataEdicao || obs.dataedicao,
          })));
        })
        .catch(() => setObsPreview([]))
        .finally(() => setObsPreviewLoading(false));
    }
  };

  return (
    <div className={`pedido-card ${atrasado ? 'atrasado' : ''}`}>
      <div className="pedido-card-header">
        <div>
          <span className="pedido-card-empresa">{pedido.empresa || 'Não informado'}</span>
          <span className="pedido-card-os">Nº OS {pedido.numeroOS || 'Não informado'}</span>
        </div>
        <div className="pedido-card-header-icons">
          {tipo === 'andamento' && pedido.prioritario && (
            <span className="pedido-card-prioridade-badge" title="Prioridade de produção">
              <FiStar /> {pedido.ordemPrioridade != null ? `#${pedido.ordemPrioridade}` : 'Prioritário'}
            </span>
          )}
          {atrasado && <FiAlertTriangle className="atrasado-icon" title="Atrasado" />}
          {temObservacoes && (
            <div
              className="pedido-card-obs-wrapper"
              onMouseEnter={handleObsHover}
              onMouseLeave={() => setShowObsTooltip(false)}
            >
              <button
                type="button"
                className="pedido-card-obs-badge"
                onClick={abrirModalObservacao}
                aria-label="Ver observações"
              >
                <FiMessageSquare /> <span>{pedido.observacoesCount}</span>
              </button>
              {showObsTooltip && (
                <div className="obs-tooltip">
                  {obsPreviewLoading && <p className="obs-tooltip-status">Carregando observações...</p>}
                  {!obsPreviewLoading && obsPreview && obsPreview.length === 0 && (
                    <p className="obs-tooltip-status">Nenhuma observação encontrada.</p>
                  )}
                  {!obsPreviewLoading && obsPreview && obsPreview.length > 0 && (
                    <ul>
                      {[...obsPreview].reverse().slice(0, 5).map((obs) => (
                        <li key={obs.id}>
                          <span className="obs-tooltip-date">{formatarDataHora(obs.dataEdicao)}</span>
                          <span className="obs-tooltip-text">{obs.observacao}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pedido-card-meta">
        <div className="pedido-card-meta-row">
          <span className="pedido-card-meta-label">Previsão</span>
          <span>{formatarData(pedido.previsaoEntrega)}</span>
        </div>
        <div className="pedido-card-meta-row">
          <span className="pedido-card-meta-label">Entrada</span>
          <span>{formatarData(pedido.dataEntrada)}</span>
        </div>
        {pedido.responsavel && (
          <div className="pedido-card-meta-row">
            <span className="pedido-card-meta-label">Responsável</span>
            <span>{pedido.responsavel}</span>
          </div>
        )}
        <div className="pedido-card-meta-row">
          <span className="pedido-card-meta-label">Início</span>
          <span>{formatarDataHora(pedido.inicio)}</span>
        </div>
        {tipo === 'concluido' && (
          <div className="pedido-card-meta-row">
            <span className="pedido-card-meta-label">Conclusão</span>
            <span>{formatarDataHora(pedido.dataConclusao) || 'Não concluído'}</span>
          </div>
        )}
      </div>

      <button className="btn-expandir" onClick={() => setExpandido((v) => !v)}>
        {expandido ? <><FiChevronUp /> Ocultar itens</> : <><FiChevronDown /> {pedido.itens?.length || 0} item(ns)</>}
      </button>

      {expandido && (
        <table className="tabela-itens">
          <thead>
            <tr>
              <th>Código</th>
              <th>Pedido</th>
              <th>Entregue</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {pedido.itens && pedido.itens.length > 0 ? (
              pedido.itens.map((item, idx) => {
                const qtdPedido = parseInt(item.quantidadePedido, 10) || 0;
                const qtdEntregue = parseInt(item.quantidadeEntregue, 10) || 0;
                const saldo = qtdPedido - qtdEntregue;
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
      )}

      <div className="pedido-card-actions">
        {tipo === 'novo' && (
          <button className="btn-mover" onClick={() => moverParaAndamento(pedido.id)}><FiArrowRightCircle /> Andamento</button>
        )}
        {tipo === 'andamento' && (
          <button className="btn-concluir" onClick={concluirPedido}><FiCheckCircle /> Concluir</button>
        )}
        {tipo === 'andamento' && (
          <button className="btn-editar" onClick={editarQuantidadeEntregue}><FiPackage /> Entregas</button>
        )}
        {tipo === 'novo' && (
          <button className="btn-editar" onClick={editarPedidoNovo}><FiEdit2 /> Editar</button>
        )}
        <button className="btn-observacao" onClick={abrirModalObservacao}><FiMessageSquare /> Obs</button>
        <button className="btn-excluir" onClick={excluirPedido}><FiTrash2 /> Excluir</button>
      </div>
    </div>
  );
};

export default PedidoCard;
