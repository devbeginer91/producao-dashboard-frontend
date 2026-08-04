import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiMenu, FiArrowLeft, FiSave, FiLink, FiX, FiEdit2, FiTrash2, FiPlus, FiFileText, FiArrowUp, FiArrowDown, FiRefreshCw, FiFile, FiDownload } from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';

const etapaVazia = { nome: '', setor: '', quemTexto: '', instrucoes: '', tempoIdeal: '' };

const formatarTamanho = (bytes) => {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ChicoteDetalhePage = ({
  setSidebarOpen,
  voltarRoute = (cliente) => `/chicotes-eletricos/${encodeURIComponent(cliente)}`,
  somenteLeitura = false,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chicote, setChicote] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [form, setForm] = useState({ codigoItemCliente: '', codigoDca: '', tempoIdeal: '' });
  const [itensDisponiveis, setItensDisponiveis] = useState([]);
  const [itemParaVincular, setItemParaVincular] = useState('');
  const [desenhosDisponiveis, setDesenhosDisponiveis] = useState([]);
  const [desenhoParaVincular, setDesenhoParaVincular] = useState('');
  const [etapaEmEdicaoId, setEtapaEmEdicaoId] = useState(null);
  const [formEtapa, setFormEtapa] = useState(etapaVazia);
  const [mostrarFormNovaEtapa, setMostrarFormNovaEtapa] = useState(false);
  const [novaEtapa, setNovaEtapa] = useState(etapaVazia);
  const [calculandoMedia, setCalculandoMedia] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  const carregar = () => {
    setCarregando(true);
    api.get(`/chicotes/${id}`)
      .then((r) => {
        setChicote(r.data);
        setForm({
          codigoItemCliente: r.data.codigoItemCliente || '',
          codigoDca: r.data.codigoDca || '',
          tempoIdeal: r.data.tempoIdeal ?? '',
        });
      })
      .catch((e) => setMensagem('Erro: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (somenteLeitura || !chicote || chicote.etapas.length === 0) return;
    api.get('/itens-pedidos')
      .then((r) => {
        const disponiveis = r.data.filter(
          (item) => !item.chicoteId && item.empresa.trim().toUpperCase() === chicote.cliente.trim().toUpperCase()
        );
        setItensDisponiveis(disponiveis);
      })
      .catch(() => setItensDisponiveis([]));
  }, [chicote]);

  useEffect(() => {
    if (somenteLeitura || !chicote) return;
    api.get('/desenhos', { params: { cliente: chicote.cliente, vinculado: false } })
      .then((r) => setDesenhosDisponiveis(r.data))
      .catch(() => setDesenhosDisponiveis([]));
  }, [chicote]);

  const salvarChicote = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/chicotes/${id}`, {
        codigoItemCliente: form.codigoItemCliente,
        codigoDca: form.codigoDca || null,
        tempoIdeal: form.tempoIdeal === '' ? null : parseFloat(form.tempoIdeal),
      });
      setMensagem('Chicote atualizado.');
      carregar();
    } catch (error) {
      setMensagem('Erro ao salvar: ' + (error.response?.data?.message || error.message));
    }
  };

  const calcularMediaTempos = async () => {
    if (!window.confirm('Calcular a média de tempo com base nas últimas execuções concluídas? Isso vai substituir o "Tempo cadastrado" atual do chicote e o tempo ideal de cada etapa.')) return;
    setCalculandoMedia(true);
    try {
      const response = await api.post(`/chicotes/${id}/calcular-media-tempos`);
      const os = response.data.pedidos.map((p) => `${p.empresa} OS ${p.numeroOS}`).join(', ');
      setMensagem(`Média atualizada com base em ${response.data.execucoesUsadas} execução(ões): ${os}.`);
      carregar();
    } catch (error) {
      setMensagem('Erro ao calcular média: ' + (error.response?.data?.message || error.message));
    } finally {
      setCalculandoMedia(false);
    }
  };

  const vincularItem = async () => {
    if (!itemParaVincular) return;
    try {
      await api.put(`/itens-pedidos/${itemParaVincular}/chicote`, { chicoteId: parseInt(id, 10) });
      setItemParaVincular('');
      carregar();
    } catch (error) {
      setMensagem('Erro ao vincular: ' + (error.response?.data?.message || error.message));
    }
  };

  const desvincularItem = async (itemId) => {
    try {
      await api.put(`/itens-pedidos/${itemId}/chicote`, { chicoteId: null });
      carregar();
    } catch (error) {
      setMensagem('Erro ao desvincular: ' + (error.response?.data?.message || error.message));
    }
  };

  const vincularDesenho = async () => {
    if (!desenhoParaVincular) return;
    try {
      await api.put(`/desenhos/${desenhoParaVincular}/vincular`, { chicoteId: parseInt(id, 10) });
      setDesenhoParaVincular('');
      carregar();
    } catch (error) {
      setMensagem('Erro ao vincular desenho: ' + (error.response?.data?.message || error.message));
    }
  };

  const desvincularDesenho = async (desenhoId) => {
    try {
      await api.put(`/desenhos/${desenhoId}/vincular`, { chicoteId: null });
      carregar();
    } catch (error) {
      setMensagem('Erro ao desvincular desenho: ' + (error.response?.data?.message || error.message));
    }
  };

  const excluirDesenho = async (desenhoId) => {
    if (!window.confirm('Excluir essa versão antiga do desenho permanentemente? Essa ação não pode ser desfeita.')) return;
    try {
      await api.delete(`/desenhos/${desenhoId}`);
      carregar();
    } catch (error) {
      setMensagem('Erro ao excluir desenho: ' + (error.response?.data?.message || error.message));
    }
  };

  const iniciarEdicaoEtapa = (etapa) => {
    setEtapaEmEdicaoId(etapa.id);
    setFormEtapa({
      nome: etapa.nome || '',
      setor: etapa.setor || '',
      quemTexto: etapa.quemTexto || '',
      instrucoes: etapa.instrucoes || '',
      tempoIdeal: etapa.tempoIdeal ?? '',
    });
  };

  const cancelarEdicaoEtapa = () => {
    setEtapaEmEdicaoId(null);
    setFormEtapa(etapaVazia);
  };

  const salvarEdicaoEtapa = async (etapaId) => {
    if (!formEtapa.nome.trim()) {
      setMensagem('Erro: nome da etapa é obrigatório.');
      return;
    }
    try {
      await api.put(`/etapas-chicote/${etapaId}`, {
        nome: formEtapa.nome,
        setor: formEtapa.setor || null,
        quemTexto: formEtapa.quemTexto || null,
        instrucoes: formEtapa.instrucoes || null,
        tempoIdeal: formEtapa.tempoIdeal === '' ? null : parseFloat(formEtapa.tempoIdeal),
      });
      cancelarEdicaoEtapa();
      carregar();
    } catch (error) {
      setMensagem('Erro ao salvar etapa: ' + (error.response?.data?.message || error.message));
    }
  };

  const moverEtapa = async (etapaId, direcao) => {
    try {
      await api.put(`/etapas-chicote/${etapaId}/mover`, { direcao });
      carregar();
    } catch (error) {
      setMensagem('Erro ao mover etapa: ' + (error.response?.data?.message || error.message));
    }
  };

  const removerEtapa = async (etapaId) => {
    if (!window.confirm('Remover essa etapa do passo a passo? Essa ação não pode ser desfeita.')) return;
    try {
      await api.delete(`/etapas-chicote/${etapaId}`);
      carregar();
    } catch (error) {
      setMensagem('Erro ao remover etapa: ' + (error.response?.data?.message || error.message));
    }
  };

  const adicionarEtapa = async (e) => {
    e.preventDefault();
    if (!novaEtapa.nome.trim()) {
      setMensagem('Erro: nome da etapa é obrigatório.');
      return;
    }
    try {
      await api.post(`/chicotes/${id}/etapas`, {
        nome: novaEtapa.nome,
        setor: novaEtapa.setor || null,
        quemTexto: novaEtapa.quemTexto || null,
        instrucoes: novaEtapa.instrucoes || null,
        tempoIdeal: novaEtapa.tempoIdeal === '' ? null : parseFloat(novaEtapa.tempoIdeal),
      });
      setNovaEtapa(etapaVazia);
      setMostrarFormNovaEtapa(false);
      carregar();
    } catch (error) {
      setMensagem('Erro ao adicionar etapa: ' + (error.response?.data?.message || error.message));
    }
  };

  const emitirPdfEtapas = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Ficha de Etapas', 14, 18);
    doc.setFontSize(10);
    doc.text(`Cliente: ${chicote.cliente || '—'}`, 14, 26);
    doc.text(`Código item cliente: ${chicote.codigoItemCliente || '—'}`, 14, 32);
    doc.text(`Código DCA: ${chicote.codigoDca || 'não informado'}`, 14, 38);

    autoTable(doc, {
      head: [['Ordem', 'Etapa', 'Setor', 'Quem executa', 'Instruções']],
      body: chicote.etapas.map((e) => [
        e.ordem,
        e.nome,
        e.setor || '—',
        e.quemTexto || '—',
        e.instrucoes || '',
      ]),
      startY: 44,
      styles: { fontSize: 9, cellWidth: 'wrap' },
      columnStyles: { 4: { cellWidth: 70 } },
    });

    const nomeArquivo = `ficha_etapas_${chicote.codigoItemCliente.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
    doc.save(nomeArquivo);
  };

  if (carregando) return <p className="loading">Carregando chicote...</p>;
  if (!chicote) return <p className="erro">{mensagem || 'Chicote não encontrado.'}</p>;

  const desenhosAtivos = chicote.desenhos.filter((d) => d.ativo);
  const desenhosHistorico = chicote.desenhos.filter((d) => !d.ativo);

  return (
    <>
      <header className="topbar">
        {setSidebarOpen && (
          <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <FiMenu />
          </button>
        )}
        <h1>{chicote.cliente} — {chicote.codigoItemCliente}</h1>
      </header>

      <button className="op-voltar" onClick={() => navigate(voltarRoute(chicote.cliente))}>
        <FiArrowLeft /> Voltar aos chicotes de {chicote.cliente}
      </button>

      {mensagem && <p className={mensagem.includes('Erro') ? 'erro' : 'sucesso'}>{mensagem}</p>}

      {somenteLeitura ? (
        <dl className="chicote-dados-leitura">
          <div>
            <dt>Código do item cliente</dt>
            <dd>{chicote.codigoItemCliente}</dd>
          </div>
          <div>
            <dt>Código DCA</dt>
            <dd>{chicote.codigoDca || '—'}</dd>
          </div>
          <div>
            <dt>Tempo cadastrado</dt>
            <dd>{chicote.tempoIdeal != null ? `${chicote.tempoIdeal} min` : 'não cadastrado'}</dd>
          </div>
        </dl>
      ) : (
        <form className="chicote-dados-form" onSubmit={salvarChicote}>
          <div>
            <label htmlFor="chicote-codigo">Código do item cliente</label>
            <input
              id="chicote-codigo"
              value={form.codigoItemCliente}
              onChange={(e) => setForm({ ...form, codigoItemCliente: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="chicote-dca">Código DCA</label>
            <input id="chicote-dca" value={form.codigoDca} onChange={(e) => setForm({ ...form, codigoDca: e.target.value })} />
          </div>
          <div>
            <label htmlFor="chicote-tempo">Tempo cadastrado (min)</label>
            <input
              id="chicote-tempo"
              type="number"
              min="0"
              value={form.tempoIdeal}
              onChange={(e) => setForm({ ...form, tempoIdeal: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-submit"><FiSave /> Salvar</button>
          <button type="button" className="btn-editar" onClick={calcularMediaTempos} disabled={calculandoMedia}>
            <FiRefreshCw /> {calculandoMedia ? 'Calculando...' : 'Autorizar Média de Tempos'}
          </button>
        </form>
      )}

      <h2 className="op-detalhe-titulo secao-titulo">Passo a passo (etapas)</h2>
      {chicote.etapas.length > 0 && (
        <button type="button" className="btn-editar chicote-btn-pdf" onClick={emitirPdfEtapas}>
          <FiFileText /> Emitir PDF
        </button>
      )}
      {chicote.etapas.length === 0 && !mostrarFormNovaEtapa && (
        <p className="pedido-grid-empty">Nenhuma etapa cadastrada ainda. Cadastre o passo a passo pra poder vincular pedidos a esse chicote.</p>
      )}

      {chicote.etapas.length > 0 && (
        <ol className="chicote-etapas-list">
          {chicote.etapas.map((e, idx) => (
            <li key={e.id} className="chicote-etapa-item">
              {etapaEmEdicaoId === e.id ? (
                <div className="chicote-etapa-form">
                  <div>
                    <label>Nome da etapa</label>
                    <input value={formEtapa.nome} onChange={(ev) => setFormEtapa({ ...formEtapa, nome: ev.target.value })} required />
                  </div>
                  <div>
                    <label>Setor</label>
                    <input value={formEtapa.setor} onChange={(ev) => setFormEtapa({ ...formEtapa, setor: ev.target.value })} />
                  </div>
                  <div>
                    <label>Quem executa</label>
                    <input value={formEtapa.quemTexto} onChange={(ev) => setFormEtapa({ ...formEtapa, quemTexto: ev.target.value })} />
                  </div>
                  <div>
                    <label>Tempo ideal (min)</label>
                    <input type="number" min="0" value={formEtapa.tempoIdeal} onChange={(ev) => setFormEtapa({ ...formEtapa, tempoIdeal: ev.target.value })} />
                  </div>
                  <div className="chicote-etapa-form-instrucoes">
                    <label>Instruções</label>
                    <textarea rows={3} value={formEtapa.instrucoes} onChange={(ev) => setFormEtapa({ ...formEtapa, instrucoes: ev.target.value })} />
                  </div>
                  <div className="chicote-etapa-form-acoes">
                    <button type="button" className="btn-submit" onClick={() => salvarEdicaoEtapa(e.id)}><FiSave /> Salvar</button>
                    <button type="button" className="btn-editar" onClick={cancelarEdicaoEtapa}><FiX /> Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="chicote-etapa-ordem">{e.ordem}</span>
                  <div className="chicote-etapa-conteudo">
                    <div className="chicote-etapa-nome">{e.nome}</div>
                    <div className="chicote-etapa-meta">
                      {e.setor} · {e.quemTexto} {e.tempoIdeal ? `· meta ${e.tempoIdeal} min` : ''}
                    </div>
                    {e.instrucoes && <div className="chicote-etapa-instrucoes">{e.instrucoes}</div>}
                  </div>
                  {!somenteLeitura && (
                    <div className="chicote-etapa-acoes">
                      <button
                        type="button"
                        className="btn-editar"
                        onClick={() => moverEtapa(e.id, 'cima')}
                        disabled={idx === 0}
                        title="Mover para cima"
                      >
                        <FiArrowUp />
                      </button>
                      <button
                        type="button"
                        className="btn-editar"
                        onClick={() => moverEtapa(e.id, 'baixo')}
                        disabled={idx === chicote.etapas.length - 1}
                        title="Mover para baixo"
                      >
                        <FiArrowDown />
                      </button>
                      <button type="button" className="btn-editar" onClick={() => iniciarEdicaoEtapa(e)}><FiEdit2 /></button>
                      <button type="button" className="btn-excluir" onClick={() => removerEtapa(e.id)}><FiTrash2 /></button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      {!somenteLeitura && (mostrarFormNovaEtapa ? (
        <form className="chicote-etapa-form chicote-etapa-form-nova" onSubmit={adicionarEtapa}>
          <div>
            <label>Nome da etapa</label>
            <input value={novaEtapa.nome} onChange={(e) => setNovaEtapa({ ...novaEtapa, nome: e.target.value })} required autoFocus />
          </div>
          <div>
            <label>Setor</label>
            <input value={novaEtapa.setor} onChange={(e) => setNovaEtapa({ ...novaEtapa, setor: e.target.value })} />
          </div>
          <div>
            <label>Quem executa</label>
            <input value={novaEtapa.quemTexto} onChange={(e) => setNovaEtapa({ ...novaEtapa, quemTexto: e.target.value })} />
          </div>
          <div>
            <label>Tempo ideal (min)</label>
            <input type="number" min="0" value={novaEtapa.tempoIdeal} onChange={(e) => setNovaEtapa({ ...novaEtapa, tempoIdeal: e.target.value })} />
          </div>
          <div className="chicote-etapa-form-instrucoes">
            <label>Instruções</label>
            <textarea rows={3} value={novaEtapa.instrucoes} onChange={(e) => setNovaEtapa({ ...novaEtapa, instrucoes: e.target.value })} />
          </div>
          <div className="chicote-etapa-form-acoes">
            <button type="submit" className="btn-submit"><FiSave /> Adicionar etapa</button>
            <button type="button" className="btn-editar" onClick={() => { setMostrarFormNovaEtapa(false); setNovaEtapa(etapaVazia); }}><FiX /> Cancelar</button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-adicionar-pedido" onClick={() => setMostrarFormNovaEtapa(true)}>
          <FiPlus /> Adicionar etapa
        </button>
      ))}

      <h2 className="op-detalhe-titulo secao-titulo">Itens de pedido vinculados</h2>
      {chicote.itensVinculados.length === 0 ? (
        <p className="pedido-grid-empty">Nenhum item vinculado ainda.</p>
      ) : (
        <div className="op-itens-list">
          {chicote.itensVinculados.map((item) => (
            <div key={item.id} className="op-item-row op-item-row-estatico">
              <span className="op-item-codigo">{item.empresa} · OS {item.numeroOS} · {item.codigoDesenho}</span>
              <span className={`pcp-status pcp-status-${item.status}`}>{item.status}</span>
              {!somenteLeitura && (
                <button type="button" className="btn-excluir" onClick={() => desvincularItem(item.id)}>
                  <FiX /> Desvincular
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!somenteLeitura && (chicote.etapas.length === 0 ? (
        <p className="pedido-grid-empty">Cadastre o passo a passo desse chicote antes de vincular pedidos a ele.</p>
      ) : (
        <div className="chicote-vincular-item">
          <select value={itemParaVincular} onChange={(e) => setItemParaVincular(e.target.value)}>
            <option value="">— selecionar item de pedido pra vincular —</option>
            {itensDisponiveis.map((item) => (
              <option key={item.id} value={item.id}>
                {item.empresa} · OS {item.numeroOS} · {item.codigoDesenho}
              </option>
            ))}
          </select>
          <button type="button" className="btn-editar" onClick={vincularItem} disabled={!itemParaVincular}>
            <FiLink /> Vincular
          </button>
        </div>
      ))}

      <h2 className="op-detalhe-titulo secao-titulo">Desenhos técnicos</h2>
      {desenhosAtivos.length === 0 ? (
        <p className="pedido-grid-empty">Nenhum desenho vinculado ainda.</p>
      ) : (
        <div className="op-itens-list">
          {desenhosAtivos.map((d) => (
            <div key={d.id} className="op-item-row op-item-row-estatico">
              <span className="op-item-codigo">
                <FiFile /> {d.nomeArquivo} <span className="chicote-desenho-tamanho">({formatarTamanho(d.tamanho)})</span>
              </span>
              <a
                className="btn-editar"
                href={`${api.defaults.baseURL}/desenhos/${d.id}/arquivo`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FiDownload /> Baixar
              </a>
              {!somenteLeitura && (
                <button type="button" className="btn-excluir" onClick={() => desvincularDesenho(d.id)}>
                  <FiX /> Desvincular
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {desenhosHistorico.length > 0 && (
        <>
          <button type="button" className="btn-editar chicote-btn-historico" onClick={() => setHistoricoAberto((v) => !v)}>
            <FiFileText /> {historicoAberto ? 'Ocultar' : 'Ver'} versões antigas ({desenhosHistorico.length})
          </button>
          {historicoAberto && (
            <div className="op-itens-list">
              {desenhosHistorico.map((d) => (
                <div key={d.id} className="op-item-row op-item-row-estatico op-item-row-historico">
                  <span className="op-item-codigo">
                    <FiFile /> {d.nomeArquivo} <span className="chicote-desenho-tamanho">({formatarTamanho(d.tamanho)} · versão antiga)</span>
                  </span>
                  <a
                    className="btn-editar"
                    href={`${api.defaults.baseURL}/desenhos/${d.id}/arquivo`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FiDownload /> Baixar
                  </a>
                  {!somenteLeitura && (
                    <button type="button" className="btn-excluir" onClick={() => excluirDesenho(d.id)}>
                      <FiTrash2 /> Excluir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!somenteLeitura && (desenhosDisponiveis.length === 0 ? (
        <p className="pedido-grid-empty">
          Nenhum desenho importado de {chicote.cliente} sem vínculo no momento. Importe desenhos em "Importar Arquivos".
        </p>
      ) : (
        <div className="chicote-vincular-item">
          <select value={desenhoParaVincular} onChange={(e) => setDesenhoParaVincular(e.target.value)}>
            <option value="">— selecionar desenho importado pra vincular —</option>
            {desenhosDisponiveis.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nomeArquivo} ({d.codigoArquivo})
              </option>
            ))}
          </select>
          <button type="button" className="btn-editar" onClick={vincularDesenho} disabled={!desenhoParaVincular}>
            <FiLink /> Vincular
          </button>
        </div>
      ))}
    </>
  );
};

export default ChicoteDetalhePage;
