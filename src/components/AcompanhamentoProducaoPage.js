import React, { useEffect, useRef, useState } from 'react';
import { FiMenu, FiClipboard, FiArrowLeft, FiChevronRight, FiChevronDown, FiChevronUp, FiZap, FiCheckCircle, FiRefreshCw, FiUser, FiPlay } from 'react-icons/fi';
import api from '../api';
import DesenhosVinculadosModal from './DesenhosVinculadosModal';

const formatarCronometro = (segundos) => {
  const totalSegundos = Math.max(0, Math.round(segundos));
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const statusLabel = {
  em_andamento: 'Em andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
};

const AcompanhamentoProducaoPage = ({ setSidebarOpen, isAdmin }) => {
  const [ordens, setOrdens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [osSelecionadaId, setOsSelecionadaId] = useState(null);
  const [itemSelecionadoId, setItemSelecionadoId] = useState(null);
  const [osExpandidas, setOsExpandidas] = useState({});
  const [desenhosModalItem, setDesenhosModalItem] = useState(null);
  const [modalConcluir, setModalConcluir] = useState(null);
  const [quantidadeConcluir, setQuantidadeConcluir] = useState('');
  const [colaboradorConcluirId, setColaboradorConcluirId] = useState('');
  const [colaboradores, setColaboradores] = useState([]);
  const [, forcarTick] = useState(0);
  const referencias = useRef({});

  const carregar = async () => {
    try {
      const response = await api.get('/ordens-producao/monitor');
      setOrdens(response.data);
      const mapa = {};
      response.data.forEach((ordem) => {
        ordem.itens.forEach((item) => {
          item.etapas.forEach((etapa) => {
            etapa.execucoes.forEach((exec) => {
              if (exec.status === 'em_andamento') {
                mapa[exec.id] = {
                  baseSegundos: exec.tempoAcumuladoBase,
                  referenciaInicio: new Date(exec.referenciaInicio).getTime(),
                };
              }
            });
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

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/colaboradores').then((r) => setColaboradores(r.data)).catch(() => {});
  }, [isAdmin]);

  const tempoDeExecucao = (exec) => {
    if (!exec) return 0;
    if (exec.status === 'em_andamento') {
      const ref = referencias.current[exec.id];
      if (ref) return ref.baseSegundos + (Date.now() - ref.referenciaInicio) / 1000;
      return exec.tempoAcumuladoBase ?? 0;
    }
    return exec.tempoAcumulado ?? 0;
  };

  const zerarTempo = async (execucaoId) => {
    if (!window.confirm('Zerar essa etapa? O tempo registrado será apagado e ela volta para "não iniciado" — o colaborador precisará iniciar de novo. Essa ação não pode ser desfeita.')) return;
    try {
      await api.put(`/execucoes-etapa/${execucaoId}/zerar`);
      carregar();
    } catch (error) {
      setMensagem('Erro ao zerar tempo: ' + (error.response?.data?.message || error.message));
    }
  };

  const retomarEtapa = async (execucaoId) => {
    if (!window.confirm('Retomar essa etapa? Ela volta para "em andamento" mantendo o tempo já registrado (a contagem continua de onde parou) — use quando ela foi concluída por engano. A quantidade de peças registrada nessa conclusão será apagada.')) return;
    try {
      await api.put(`/execucoes-etapa/${execucaoId}/reabrir`);
      carregar();
    } catch (error) {
      setMensagem('Erro ao retomar etapa: ' + (error.response?.data?.message || error.message));
    }
  };

  // Corrige a quantidade de uma execução já concluída sem apagar o tempo registrado nem o
  // colaborador — ao contrário de "zerar" (apaga tudo) ou "retomar" (some com o tempo pausado
  // de outro colaborador que já esteja em andamento). Usado quando alguém concluiu com a
  // quantidade errada (etapa não estava de fato pronta): corrigir pra baixo libera a etapa pra
  // outro colaborador iniciar, preservando o tempo dela nos relatórios.
  const abrirModalCorrigirQuantidade = (ex) => {
    setModalConcluir({ execucaoId: ex.id, corrigir: true });
    setQuantidadeConcluir(String(ex.quantidadeProduzida ?? 0));
    setColaboradorConcluirId('');
  };

  // Escape hatch de admin: colaborador pausou (ou nunca chegou a iniciar) e ninguém volta
  // pra concluir, o que trava a etapa e impede o cálculo de média de tempos do chicote (só
  // roda com tudo concluído). Tempo pausado/nunca iniciado não soma nada a mais no total.
  const fecharModalConcluir = () => {
    setModalConcluir(null);
    setQuantidadeConcluir('');
    setColaboradorConcluirId('');
  };

  const abrirModalConcluir = (ex, etapa) => {
    setModalConcluir({ execucaoId: ex.id });
    // Campo começa vazio de propósito: essa execução é de UM colaborador entre possivelmente
    // vários na mesma etapa, então pré-preencher com o total restante convida a fechar a
    // etapa inteira sozinho sem querer (foi exatamente isso que aconteceu na OS 929 etapa 8).
    setQuantidadeConcluir('');
    setColaboradorConcluirId('');
  };

  // Cobre tanto etapa nunca iniciada quanto etapa com execuções concluídas cuja soma de
  // peças produzidas não bateu o total do item (ex: 2 colaboradores concluíram parte cada
  // e ninguém fechou o restante) — nos dois casos não sobra execução "pendente" pra usar
  // o botão de concluir por execução, então isso cria uma execução nova já concluída.
  const abrirModalCompletarRestante = (item, etapa) => {
    setModalConcluir({ itemPedidoId: item.id, etapaChicoteId: etapa.id });
    setQuantidadeConcluir(
      etapa.quantidadeRestante != null
        ? String(etapa.quantidadeRestante)
        : item.quantidadePedido != null ? String(item.quantidadePedido) : ''
    );
    setColaboradorConcluirId('');
  };

  const confirmarConclusao = async () => {
    const quantidade = parseInt(quantidadeConcluir, 10);
    if (isNaN(quantidade) || quantidade < 0) {
      setMensagem('Informe quantas peças foram feitas.');
      return;
    }
    try {
      if (modalConcluir.corrigir) {
        await api.put(`/execucoes-etapa/${modalConcluir.execucaoId}/corrigir-quantidade`, { quantidadeProduzida: quantidade });
      } else if (modalConcluir.execucaoId) {
        await api.put(`/execucoes-etapa/${modalConcluir.execucaoId}/concluir`, { quantidadeProduzida: quantidade });
      } else {
        if (!colaboradorConcluirId) {
          setMensagem('Selecione o colaborador.');
          return;
        }
        await api.post('/execucoes-etapa/concluir-direto', {
          itemPedidoId: modalConcluir.itemPedidoId,
          etapaChicoteId: modalConcluir.etapaChicoteId,
          colaboradorId: Number(colaboradorConcluirId),
          quantidadeProduzida: quantidade,
        });
      }
      fecharModalConcluir();
      carregar();
    } catch (error) {
      const acao = modalConcluir.corrigir ? 'corrigir quantidade' : 'concluir etapa';
      setMensagem(`Erro ao ${acao}: ` + (error.response?.data?.message || error.message));
    }
  };

  const abrirOs = (id) => {
    setOsSelecionadaId(id);
    setItemSelecionadoId(null);
  };
  const abrirItem = (id) => setItemSelecionadoId(id);

  const osAtual = ordens.find((o) => o.id === osSelecionadaId);
  const itemAtual = osAtual?.itens.find((i) => i.id === itemSelecionadoId);

  const contarConcluidas = (item) => item.etapas.filter((e) => e.concluida).length;

  const itensComExecucaoAtiva = (os) => {
    const grupos = [];
    os.itens.forEach((item) => {
      const ativas = [];
      item.etapas.forEach((e) => {
        e.execucoes
          .filter((ex) => ex.status === 'em_andamento')
          .forEach((ex) => ativas.push({ key: ex.id, etapaNome: e.nome, exec: ex }));
      });
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

  const temExecucaoAtiva = (item) => item.etapas.some((e) => e.execucoes.some((ex) => ex.status === 'em_andamento'));

  return (
    <div className="colaborador-page">
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>Acompanhar Produção</h1>
      </header>

      {mensagem && <p className="erro">{mensagem}</p>}
      {carregando && <p className="loading">Carregando ordens...</p>}

      {!carregando && ordens.length === 0 && (
        <div className="pedido-grid-empty">
          <FiClipboard style={{ fontSize: 28, marginBottom: 8 }} />
          <p>Nenhuma ordem de produção priorizada por enquanto.</p>
        </div>
      )}

      {/* Nível 1: OS priorizadas */}
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
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={`op-item-row ${temExecucaoAtiva(item) ? 'op-item-row-ativo' : ''}`}
                  onClick={() => abrirItem(item.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirItem(item.id)}
                >
                  <button
                    type="button"
                    className="btn-codigo-desenho op-item-codigo"
                    onClick={(e) => { e.stopPropagation(); setDesenhosModalItem(item); }}
                    title="Ver desenhos técnicos vinculados"
                  >
                    {item.codigoDesenho}
                  </button>
                  <span className="op-item-info">
                    {item.quantidadePedido != null && (
                      <span className="op-item-info-badge">Qtd {item.quantidadePedido}</span>
                    )}
                    {item.tempoIdeal != null && (
                      <span className="op-item-info-badge">Meta {item.tempoIdeal} min</span>
                    )}
                    {item.tempoTotalReal != null && (
                      <span className="op-item-info-badge op-item-info-badge-total">
                        Total {formatarCronometro(item.tempoTotalReal)}
                      </span>
                    )}
                  </span>
                  <span className="op-item-progresso">
                    {contarConcluidas(item)}/{item.etapas.length} etapas concluídas
                  </span>
                  <FiChevronRight />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nível 3: etapas do item selecionado, com status/colaborador/tempo e zerar */}
      {itemAtual && (
        <div className="op-detalhe">
          <button className="op-voltar" onClick={() => abrirItem(null)}>
            <FiArrowLeft /> Voltar aos itens
          </button>
          <h2 className="op-detalhe-titulo">
            {osAtual.empresa} — OS {osAtual.numeroOS} · {itemAtual.codigoDesenho}
          </h2>

          <div className="monitor-etapas-list">
            {itemAtual.etapas.map((etapa) => (
              <div key={etapa.id} className="monitor-etapa-grupo">
                <div className="monitor-etapa-grupo-header">
                  <span className="monitor-etapa-nome">
                    {etapa.ordem}. {etapa.nome}
                    {etapa.tempoIdeal != null && (
                      <span className="op-item-info-badge monitor-etapa-meta">Meta {etapa.tempoIdeal} min</span>
                    )}
                  </span>
                  {etapa.quantidadeRestante != null && (
                    <span className={`monitor-etapa-qtd ${etapa.concluida ? 'monitor-etapa-qtd-completa' : ''}`}>
                      {etapa.quantidadeProduzida}/{etapa.quantidadeProduzida + etapa.quantidadeRestante} peças
                    </span>
                  )}
                  {isAdmin && !etapa.concluida && (
                    <button className="btn-concluir" onClick={() => abrirModalCompletarRestante(itemAtual, etapa)}>
                      <FiCheckCircle /> Completar restante
                    </button>
                  )}
                </div>

                {etapa.execucoes.length === 0 ? (
                  <div className="monitor-etapa-item op-etapa-pendente">
                    <div className="monitor-etapa-info">
                      <span className="monitor-etapa-status">Não iniciado</span>
                    </div>
                  </div>
                ) : (
                  etapa.execucoes.map((ex) => (
                    <div key={ex.id} className={`monitor-etapa-item op-etapa-${ex.status}`}>
                      <div className="monitor-etapa-info">
                        <span className="monitor-etapa-status">
                          {statusLabel[ex.status] || ex.status}
                          {ex.colaboradorNome && (
                            <> · <FiUser /> {ex.colaboradorNome}</>
                          )}
                          {ex.status === 'concluido' && <> <FiCheckCircle /></>}
                          {ex.status === 'concluido' && ex.quantidadeProduzida != null && (
                            <> · {ex.quantidadeProduzida} peça(s)</>
                          )}
                        </span>
                      </div>
                      <div className="monitor-etapa-acoes">
                        <span className="monitor-etapa-tempo">{formatarCronometro(tempoDeExecucao(ex))}</span>
                        {ex.status === 'concluido' && (
                          <button className="btn-editar" onClick={() => retomarEtapa(ex.id)}>
                            <FiPlay /> Retomar
                          </button>
                        )}
                        {isAdmin && ex.status === 'concluido' && (
                          <button className="btn-editar" onClick={() => abrirModalCorrigirQuantidade(ex)}>
                            <FiRefreshCw /> Corrigir quantidade
                          </button>
                        )}
                        {isAdmin && ex.status !== 'concluido' && (
                          <button className="btn-concluir" onClick={() => abrirModalConcluir(ex, etapa)}>
                            <FiCheckCircle /> Concluir
                          </button>
                        )}
                        <button className="btn-excluir" onClick={() => zerarTempo(ex.id)}>
                          <FiRefreshCw /> Zerar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {desenhosModalItem && (
        <DesenhosVinculadosModal
          chicoteId={desenhosModalItem.chicoteId}
          codigoDesenho={desenhosModalItem.codigoDesenho}
          onClose={() => setDesenhosModalItem(null)}
        />
      )}

      {modalConcluir && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2><FiCheckCircle /> {modalConcluir.corrigir ? 'Qual é a quantidade correta?' : 'Quantas peças foram feitas?'}</h2>
            {modalConcluir.corrigir && (
              <p className="pedido-grid-empty">O tempo já registrado dessa execução não é alterado — só a quantidade de peças.</p>
            )}
            {!modalConcluir.execucaoId && (
              <select value={colaboradorConcluirId} onChange={(e) => setColaboradorConcluirId(e.target.value)}>
                <option value="">Selecione o colaborador</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            )}
            <input
              type="number"
              min="0"
              autoFocus
              value={quantidadeConcluir}
              onChange={(e) => setQuantidadeConcluir(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmarConclusao()}
            />
            <button onClick={confirmarConclusao}>
              <FiCheckCircle /> Confirmar
            </button>
            <button className="btn-fechar-modal" onClick={fecharModalConcluir}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcompanhamentoProducaoPage;
