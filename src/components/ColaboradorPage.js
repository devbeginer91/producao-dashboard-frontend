import React, { useEffect, useRef, useState } from 'react';
import { FiLogOut, FiPlay, FiPause, FiCheckCircle, FiClipboard, FiArrowLeft, FiChevronRight, FiChevronDown, FiChevronUp, FiZap, FiUser } from 'react-icons/fi';
import api from '../api';

const formatarCronometro = (segundos) => {
  const totalSegundos = Math.max(0, Math.round(segundos));
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const statusLabel = {
  em_andamento: 'em execução',
  pausado: 'pausado',
  concluido: 'concluído',
};

const ColaboradorPage = ({ colaborador, onLogout }) => {
  const [ordens, setOrdens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [osSelecionadaId, setOsSelecionadaId] = useState(null);
  const [itemSelecionadoId, setItemSelecionadoId] = useState(null);
  const [etapaSelecionadaId, setEtapaSelecionadaId] = useState(null);
  const [osExpandidas, setOsExpandidas] = useState({});
  const [, forcarTick] = useState(0);
  const referencias = useRef({});

  const carregar = async () => {
    try {
      const response = await api.get('/ordens-producao', { params: { colaboradorId: colaborador.id } });
      setOrdens(response.data);
      const mapa = {};
      response.data.forEach((ordem) => {
        ordem.itens.forEach((item) => {
          item.etapas.forEach((etapa) => {
            if (etapa.execucaoAtual?.status === 'em_andamento') {
              mapa[etapa.execucaoAtual.id] = {
                baseSegundos: etapa.execucaoAtual.tempoAcumuladoBase,
                referenciaInicio: new Date(etapa.execucaoAtual.referenciaInicio).getTime(),
              };
            }
          });
        });
      });
      referencias.current = mapa;
    } catch (error) {
      setMensagem('Erro ao carregar ordens: ' + (error.response?.data?.message || error.message));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    const poll = setInterval(carregar, 30000);
    return () => clearInterval(poll);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const t = setInterval(() => forcarTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const tempoDeExecucao = (exec) => {
    if (!exec) return 0;
    if (exec.status === 'em_andamento') {
      const ref = referencias.current[exec.id];
      if (ref) return ref.baseSegundos + (Date.now() - ref.referenciaInicio) / 1000;
      return exec.tempoAcumuladoBase ?? 0;
    }
    return exec.tempoAcumulado ?? 0;
  };

  const tempoAtualEtapa = (etapa) => tempoDeExecucao(etapa.execucaoAtual);

  const executar = async (chamada) => {
    try {
      await chamada();
      await carregar();
    } catch (error) {
      setMensagem(error.response?.data?.message || error.message);
    }
  };

  const iniciar = (item, etapa) =>
    executar(() => api.post('/execucoes-etapa/iniciar', { itemPedidoId: item.id, etapaChicoteId: etapa.id, colaboradorId: colaborador.id }));
  const pausar = (execucaoId) => executar(() => api.put(`/execucoes-etapa/${execucaoId}/pausar`));
  const retomar = (execucaoId) => executar(() => api.put(`/execucoes-etapa/${execucaoId}/retomar`));
  const concluir = (execucaoId) => executar(() => api.put(`/execucoes-etapa/${execucaoId}/concluir`));

  const abrirOs = (id) => {
    setOsSelecionadaId(id);
    setItemSelecionadoId(null);
    setEtapaSelecionadaId(null);
  };
  const abrirItem = (id) => {
    setItemSelecionadoId(id);
    setEtapaSelecionadaId(null);
  };

  const osAtual = ordens.find((o) => o.id === osSelecionadaId);
  const itemAtual = osAtual?.itens.find((i) => i.id === itemSelecionadoId);
  const etapaAtual = itemAtual?.etapas.find((e) => e.id === etapaSelecionadaId);

  const contarConcluidas = (item) => item.etapas.filter((e) => e.execucaoAtual?.status === 'concluido').length;

  const itensComExecucaoAtiva = (os) => {
    const grupos = [];
    os.itens.forEach((item) => {
      const ativas = item.etapas
        .filter((e) => e.execucaoAtual?.status === 'em_andamento')
        .map((e) => ({ key: e.execucaoAtual.id, etapaNome: e.nome, exec: e.execucaoAtual }));
      if (ativas.length > 0) {
        grupos.push({ itemId: item.id, itemCodigo: item.codigoDesenho, execucoes: ativas });
      }
    });
    return grupos;
  };

  const toggleExpandirOs = (id, e) => {
    e.stopPropagation();
    setOsExpandidas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const ehMinhaExecucao = (exec) => !exec || exec.colaboradorId === colaborador.id;

  return (
    <div className="colaborador-page">
      <header className="topbar">
        <h1>Ordens de Produção</h1>
        <button className="btn-editar" onClick={onLogout}>
          <FiLogOut /> Sair
        </button>
      </header>

      <p className="colaborador-saudacao">
        {colaborador?.nome} — matrícula {colaborador?.matricula} — {colaborador?.setor}
      </p>

      {mensagem && <p className="erro">{mensagem}</p>}
      {carregando && <p className="loading">Carregando ordens...</p>}

      {!carregando && ordens.length === 0 && (
        <div className="pedido-grid-empty">
          <FiClipboard style={{ fontSize: 28, marginBottom: 8 }} />
          <p>Nenhuma ordem de produção priorizada por enquanto.</p>
        </div>
      )}

      {/* Nível 1: lista de OS priorizadas, na ordem definida pelo PCP */}
      {!osAtual && ordens.length > 0 && (
        <div className="op-grid">
          {ordens.map((os) => {
            const grupos = itensComExecucaoAtiva(os);
            const expandida = !!osExpandidas[os.id];
            return (
              <div key={os.id} className="op-card op-card-clicavel" onClick={() => abrirOs(os.id)}>
                <div className="op-card-header">
                  <span className="op-card-empresa">{os.empresa}</span>
                  <span className="op-card-os">OS {os.numeroOS}</span>
                </div>

                {grupos.length > 0 && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="op-card-execucao-toggle" onClick={(e) => toggleExpandirOs(os.id, e)}>
                      <FiZap /> {grupos.length} {grupos.length === 1 ? 'item' : 'itens'} em execução
                      {expandida ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                    {expandida && (
                      <div className="op-card-execucao-detalhe">
                        {grupos.map((grupo) => (
                          <div key={grupo.itemId} className="op-card-execucao-grupo">
                            <div className="op-card-execucao-item-codigo">{grupo.itemCodigo}</div>
                            {grupo.execucoes.map((ex) => (
                              <div key={ex.key} className="op-card-execucao-linha">
                                <span className="op-card-execucao-etapa">{ex.etapaNome}</span>
                                <span className="op-card-execucao-colab"><FiUser /> {ex.exec.colaboradorNome}</span>
                                <span className="op-card-execucao-tempo">{formatarCronometro(tempoDeExecucao(ex.exec))}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <span className="op-card-itens-count">
                  {os.itens.length} item(ns) <FiChevronRight />
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Nível 2: itens da OS selecionada */}
      {osAtual && !itemAtual && (
        <div className="op-detalhe">
          <button className="op-voltar" onClick={() => abrirOs(null)}>
            <FiArrowLeft /> Voltar às OS
          </button>
          <h2 className="op-detalhe-titulo">{osAtual.empresa} — OS {osAtual.numeroOS}</h2>

          {osAtual.itens.length === 0 ? (
            <p className="pedido-grid-empty">Nenhum item dessa OS tem chicote vinculado ainda.</p>
          ) : (
            <div className="op-itens-list">
              {osAtual.itens.map((item) => (
                <button key={item.id} className="op-item-row" onClick={() => abrirItem(item.id)}>
                  <span className="op-item-codigo">{item.codigoDesenho}</span>
                  <span className="op-item-progresso">
                    {contarConcluidas(item)}/{item.etapas.length} etapas concluídas
                  </span>
                  <FiChevronRight />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nível 3: etapas do item selecionado */}
      {itemAtual && (
        <div className="op-detalhe">
          <button className="op-voltar" onClick={() => abrirItem(null)}>
            <FiArrowLeft /> Voltar aos itens
          </button>
          <h2 className="op-detalhe-titulo">
            {osAtual.empresa} — OS {osAtual.numeroOS} · {itemAtual.codigoDesenho}
          </h2>

          <div className="op-etapas-tabs">
            {itemAtual.etapas.map((etapa) => (
              <button
                key={etapa.id}
                className={`op-etapa-tab op-etapa-${etapa.execucaoAtual?.status || 'pendente'} ${etapaSelecionadaId === etapa.id ? 'ativa' : ''}`}
                onClick={() => setEtapaSelecionadaId(etapa.id)}
              >
                {etapa.ordem}. {etapa.nome} {etapa.execucaoAtual?.status === 'concluido' && <FiCheckCircle />}
              </button>
            ))}
          </div>

          {etapaAtual && (
            <div className="op-etapa-painel">
              <p className="op-etapa-meta">{etapaAtual.setor} · {etapaAtual.quemTexto}</p>
              {etapaAtual.instrucoes && <p className="op-etapa-instrucoes">{etapaAtual.instrucoes}</p>}
              <div className="op-cronometro">{formatarCronometro(tempoAtualEtapa(etapaAtual))}</div>

              {!ehMinhaExecucao(etapaAtual.execucaoAtual) ? (
                <p className="op-etapa-outro-colaborador">
                  <FiUser /> {etapaAtual.execucaoAtual.colaboradorNome} — {statusLabel[etapaAtual.execucaoAtual.status]}
                </p>
              ) : (
                <div className="op-controles">
                  {!etapaAtual.minhaExecucao && (
                    <button className="btn-concluir" onClick={() => iniciar(itemAtual, etapaAtual)}>
                      <FiPlay /> Início
                    </button>
                  )}
                  {etapaAtual.minhaExecucao?.status === 'em_andamento' && (
                    <button className="btn-pausar" onClick={() => pausar(etapaAtual.minhaExecucao.id)}>
                      <FiPause /> Pausa
                    </button>
                  )}
                  {etapaAtual.minhaExecucao?.status === 'pausado' && (
                    <button className="btn-retomar" onClick={() => retomar(etapaAtual.minhaExecucao.id)}>
                      <FiPlay /> Retomar
                    </button>
                  )}
                  {etapaAtual.minhaExecucao && etapaAtual.minhaExecucao.status !== 'concluido' && (
                    <button className="btn-excluir" onClick={() => concluir(etapaAtual.minhaExecucao.id)}>
                      <FiCheckCircle /> Concluir
                    </button>
                  )}
                  {etapaAtual.minhaExecucao?.status === 'concluido' && (
                    <p className="op-etapa-concluida">
                      <FiCheckCircle /> Etapa concluída
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ColaboradorPage;
