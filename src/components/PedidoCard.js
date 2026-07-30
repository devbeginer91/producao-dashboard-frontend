import React, { useState } from 'react';
import api from '../api';
import { formatarDataHora, isPastDue } from '../utils';
import {
  FiCheckCircle,
  FiTrash2,
  FiMessageSquare,
  FiChevronDown,
  FiChevronUp,
  FiAlertTriangle,
  FiPackage,
  FiStar,
  FiClock,
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

const formatarCronometro = (segundos) => {
  const totalSegundos = Math.max(0, Math.round(segundos));
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
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
}) => {
  const [expandido, setExpandido] = useState(false);
  const [obsPreview, setObsPreview] = useState(null);
  const [obsPreviewLoading, setObsPreviewLoading] = useState(false);
  const [showObsTooltip, setShowObsTooltip] = useState(false);
  const [itemTemposAbertos, setItemTemposAbertos] = useState({});

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

  const temItemEmExecucao = (pedido.itens || []).some((item) => item.producao?.temExecucaoAtiva);

  const confirmarSeEmExecucao = () => {
    if (!temItemEmExecucao) return true;
    return window.confirm(
      'Este pedido tem etapa(s) de produção em execução no momento. Deseja continuar mesmo assim?'
    );
  };

  const concluirPedido = () => {
    if (!confirmarSeEmExecucao()) return;
    const inicioValido = pedido.inicio && !pedido.inicio.includes('undefined')
      ? formatDateToLocalISO(pedido.inicio)
      : formatDateToLocalISO(new Date());
    setPedidoParaConcluir({ ...pedido, inicio: inicioValido });
    setMostrarModalPesoVolume(true);
  };

  const editarQuantidadeEntregue = () => {
    if (!confirmarSeEmExecucao()) return;
    const inicioValido = pedido.inicio && !pedido.inicio.includes('undefined')
      ? formatDateToLocalISO(pedido.inicio)
      : formatDateToLocalISO(new Date());
    setPedidoParaConcluir({ ...pedido, inicio: inicioValido, itemParaEditar: true });
    setMostrarModalPesoVolume(true);
  };

  const toggleItemTempos = (idx) => {
    setItemTemposAbertos((prev) => ({ ...prev, [idx]: !prev[idx] }));
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
          {(tipo === 'andamento' || tipo === 'novo') && pedido.prioritario && (
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
        {pedido.ocCliente && (
          <div className="pedido-card-meta-row">
            <span className="pedido-card-meta-label">OC Cliente</span>
            <span>{pedido.ocCliente}</span>
          </div>
        )}
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pedido.itens && pedido.itens.length > 0 ? (
              pedido.itens.map((item, idx) => {
                const qtdPedido = parseInt(item.quantidadePedido, 10) || 0;
                const qtdEntregue = parseInt(item.quantidadeEntregue, 10) || 0;
                const saldo = qtdPedido - qtdEntregue;
                const producao = item.producao;
                const temposAberto = !!itemTemposAbertos[idx];
                return (
                  <React.Fragment key={idx}>
                    <tr>
                      <td>{item.codigoDesenho || 'Não informado'}</td>
                      <td>{qtdPedido}</td>
                      <td>{qtdEntregue}</td>
                      <td>{isNaN(saldo) ? '0' : saldo}</td>
                      <td>
                        {producao && producao.totalEtapas > 0 && (
                          <button
                            type="button"
                            className="btn-item-tempos"
                            onClick={() => toggleItemTempos(idx)}
                            title="Ver tempos de produção"
                          >
                            <FiClock /> {temposAberto ? <FiChevronUp /> : <FiChevronDown />}
                          </button>
                        )}
                      </td>
                    </tr>
                    {producao && producao.totalEtapas > 0 && temposAberto && (
                      <tr className="item-tempos-row">
                        <td colSpan="5">
                          {producao.etapasConcluidas.length > 0 ? (
                            <ul className="item-tempos-lista">
                              {producao.etapasConcluidas.map((e, i) => (
                                <li key={i}>
                                  <span className="item-tempos-etapa-nome">{e.nome}</span>
                                  <span className="item-tempos-etapa-colab">{e.colaboradores.join(', ')}</span>
                                  <span className="item-tempos-etapa-tempo">{formatarCronometro(e.tempoSegundos)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="item-tempos-vazio">Nenhuma etapa concluída ainda.</p>
                          )}
                          <div className="item-tempos-total">
                            <span>Total por peça ({producao.etapasConcluidas.length}/{producao.totalEtapas} etapas concluídas)</span>
                            <strong>{producao.tempoTotalReal != null ? formatarCronometro(producao.tempoTotalReal) : '—'}</strong>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan="5">Nenhum item encontrado</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div className="pedido-card-actions">
        {tipo === 'andamento' && (
          <button className="btn-concluir" onClick={concluirPedido}><FiCheckCircle /> Concluir</button>
        )}
        {tipo === 'andamento' && (
          <button className="btn-editar" onClick={editarQuantidadeEntregue}><FiPackage /> Entregas</button>
        )}
        <button className="btn-observacao" onClick={abrirModalObservacao}><FiMessageSquare /> Obs</button>
        <button className="btn-excluir" onClick={excluirPedido}><FiTrash2 /> Excluir</button>
      </div>
    </div>
  );
};

export default PedidoCard;
