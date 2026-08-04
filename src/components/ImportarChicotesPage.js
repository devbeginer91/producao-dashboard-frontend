import React, { useEffect, useState } from 'react';
import { FiMenu, FiUpload, FiAlertTriangle, FiCheckCircle, FiXCircle, FiRefreshCw, FiFile, FiLink } from 'react-icons/fi';
import api from '../api';

const ImportarEtapasTab = () => {
  const [arquivosSelecionados, setArquivosSelecionados] = useState([]);
  const [resultados, setResultados] = useState(null);
  const [analisando, setAnalisando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [resumoConfirmacao, setResumoConfirmacao] = useState(null);
  const [mensagem, setMensagem] = useState('');

  const handleSelecionarArquivos = (e) => {
    setArquivosSelecionados(Array.from(e.target.files || []));
    setResultados(null);
    setResumoConfirmacao(null);
    setMensagem('');
  };

  const analisarArquivos = async () => {
    if (arquivosSelecionados.length === 0) {
      setMensagem('Selecione ao menos um arquivo .xlsx.');
      return;
    }
    setAnalisando(true);
    setMensagem('');
    setResumoConfirmacao(null);
    try {
      const formData = new FormData();
      arquivosSelecionados.forEach((file) => formData.append('arquivos', file));
      const response = await api.post('/chicotes/import/preview', formData);
      setResultados(response.data.resultados.map((r) => ({ ...r, incluir: !r.erroLeitura })));
    } catch (error) {
      setMensagem('Erro ao analisar arquivos: ' + (error.response?.data?.message || error.message));
    } finally {
      setAnalisando(false);
    }
  };

  const toggleIncluir = (index) => {
    setResultados((prev) => prev.map((r, i) => (i === index ? { ...r, incluir: !r.incluir } : r)));
  };

  const confirmarImportacao = async () => {
    const itens = resultados.filter((r) => r.incluir && !r.erroLeitura);
    if (itens.length === 0) {
      setMensagem('Nenhum arquivo marcado para importar.');
      return;
    }
    setConfirmando(true);
    setMensagem('');
    try {
      const response = await api.post('/chicotes/import/confirm', {
        itens: itens.map((r) => ({ arquivo: r.arquivo, chicote: r.chicote, etapas: r.etapas })),
      });
      setResumoConfirmacao(response.data.resultados);
    } catch (error) {
      setMensagem('Erro ao confirmar importação: ' + (error.response?.data?.message || error.message));
    } finally {
      setConfirmando(false);
    }
  };

  const statusPorArquivo = (arquivo) =>
    resumoConfirmacao?.find((r) => r.arquivo === arquivo);

  return (
    <>
      {mensagem && <p className="erro">{mensagem}</p>}

      <div className="import-uploader">
        <input
          type="file"
          accept=".xlsx"
          multiple
          onChange={handleSelecionarArquivos}
          id="import-file-input"
        />
        <label htmlFor="import-file-input" className="btn-editar">
          <FiUpload /> {arquivosSelecionados.length > 0 ? `${arquivosSelecionados.length} arquivo(s) selecionado(s)` : 'Escolher arquivos .xlsx'}
        </label>
        <button className="btn-adicionar-pedido" onClick={analisarArquivos} disabled={analisando}>
          {analisando ? 'Analisando...' : 'Analisar arquivos'}
        </button>
      </div>

      {resultados && (
        <>
          <div className="import-grid">
            {resultados.map((r, index) => {
              const status = statusPorArquivo(r.arquivo);
              return (
                <div key={r.arquivo + index} className={`import-card ${r.erroLeitura ? 'import-card-erro' : ''}`}>
                  <div className="import-stamp">
                    <label className="import-checkbox">
                      <input
                        type="checkbox"
                        checked={r.incluir}
                        onChange={() => toggleIncluir(index)}
                        disabled={!!r.erroLeitura}
                      />
                      <span className="import-file">{r.arquivo}</span>
                    </label>

                    {r.erroLeitura ? (
                      <p className="import-erro-leitura"><FiAlertTriangle /> Não foi possível ler: {r.erroLeitura}</p>
                    ) : (
                      <>
                        <dl className="import-kv">
                          <dt>Cliente</dt><dd>{r.chicote.cliente || '—'}</dd>
                          <dt>Cód. item cliente</dt><dd>{r.chicote.codigoItemCliente || '—'}</dd>
                          <dt>Código DCA</dt>
                          <dd className={!r.chicote.codigoDca ? 'empty' : ''}>{r.chicote.codigoDca || 'não informado'}</dd>
                        </dl>
                        {r.existente && (
                          <span className="import-badge-existente"><FiRefreshCw /> Já existe — etapas serão substituídas</span>
                        )}
                      </>
                    )}

                    {status && (
                      <span className={`import-badge-status ${status.sucesso ? 'ok' : 'erro'}`}>
                        {status.sucesso ? <><FiCheckCircle /> Importado (ID {status.chicoteId})</> : <><FiXCircle /> {status.erro}</>}
                      </span>
                    )}
                  </div>

                  {!r.erroLeitura && (
                    <ol className="import-steps">
                      {r.etapas.map((etapa) => (
                        <li key={etapa.ordem} className="import-step">
                          <div className="import-step-badge">{etapa.ordem}</div>
                          <div>
                            <div className="import-step-name">{etapa.nome}</div>
                            <div className="import-tags">
                              <span className="import-tag">{etapa.setor || 'sem setor'}</span>
                              <span className="import-tag import-tag-people">
                                {etapa.colaboradores ?? '?'} {etapa.colaboradores === 1 ? 'colaborador' : 'colaboradores'}
                              </span>
                            </div>
                            <div className="import-instr">{etapa.instrucoes}</div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}

                  {!r.erroLeitura && r.ignoradas.length > 0 && (
                    <div className="import-review">
                      <div className="import-review-title">{r.ignoradas.length} linha(s) para revisão</div>
                      {r.ignoradas.map((ig, i) => (
                        <div key={i}>Linha {ig.linha}: <code>{ig.conteudo.join(' | ')}</code></div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="import-actions">
            <button className="btn-submit" onClick={confirmarImportacao} disabled={confirmando}>
              {confirmando ? 'Importando...' : 'Confirmar importação'}
            </button>
          </div>
        </>
      )}
    </>
  );
};

const ImportarDesenhosTab = () => {
  const [arquivoZip, setArquivoZip] = useState(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [mensagem, setMensagem] = useState('');

  const [arquivosAvulsos, setArquivosAvulsos] = useState([]);
  const [clienteAvulso, setClienteAvulso] = useState('');
  const [clientesExistentes, setClientesExistentes] = useState([]);
  const [importandoAvulsos, setImportandoAvulsos] = useState(false);
  const [resultadoAvulsos, setResultadoAvulsos] = useState(null);
  const [mensagemAvulsos, setMensagemAvulsos] = useState('');

  useEffect(() => {
    api.get('/chicotes/clientes').then((r) => setClientesExistentes(r.data)).catch(() => setClientesExistentes([]));
  }, []);

  const handleSelecionarZip = (e) => {
    setArquivoZip(e.target.files?.[0] || null);
    setResultado(null);
    setMensagem('');
  };

  const importarZip = async () => {
    if (!arquivoZip) {
      setMensagem('Selecione um arquivo .zip.');
      return;
    }
    setImportando(true);
    setMensagem('');
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivoZip);
      const response = await api.post('/desenhos/importar-zip', formData);
      setResultado(response.data);
    } catch (error) {
      setMensagem('Erro ao importar desenhos: ' + (error.response?.data?.message || error.message));
    } finally {
      setImportando(false);
    }
  };

  const handleSelecionarAvulsos = (e) => {
    setArquivosAvulsos(Array.from(e.target.files || []));
    setResultadoAvulsos(null);
    setMensagemAvulsos('');
  };

  const importarAvulsos = async () => {
    if (arquivosAvulsos.length === 0) {
      setMensagemAvulsos('Selecione ao menos um arquivo (PDF ou outro formato).');
      return;
    }
    setImportandoAvulsos(true);
    setMensagemAvulsos('');
    try {
      const formData = new FormData();
      arquivosAvulsos.forEach((file) => formData.append('arquivos', file));
      if (clienteAvulso) formData.append('cliente', clienteAvulso);
      const response = await api.post('/desenhos/importar-arquivos', formData);
      setResultadoAvulsos(response.data);
      setArquivosAvulsos([]);
    } catch (error) {
      setMensagemAvulsos('Erro ao importar arquivos: ' + (error.response?.data?.message || error.message));
    } finally {
      setImportandoAvulsos(false);
    }
  };

  return (
    <>
      {mensagem && <p className="erro">{mensagem}</p>}

      <p className="import-desenhos-instrucoes">
        Envie um arquivo <strong>.zip</strong> contendo uma pasta pra cada cliente, e dentro de
        cada pasta os desenhos daquele cliente. Cada desenho é vinculado automaticamente ao
        chicote cujo código do item bate com o nome do arquivo (sem a extensão). Desenhos sem
        chicote correspondente ficam salvos sem vínculo — dá pra vincular manualmente depois,
        dentro da página do chicote em "Chicotes Elétricos".
      </p>

      <div className="import-uploader">
        <input
          type="file"
          accept=".zip"
          onChange={handleSelecionarZip}
          id="import-zip-input"
        />
        <label htmlFor="import-zip-input" className="btn-editar">
          <FiUpload /> {arquivoZip ? arquivoZip.name : 'Escolher arquivo .zip'}
        </label>
        <button className="btn-adicionar-pedido" onClick={importarZip} disabled={importando}>
          {importando ? 'Importando...' : 'Importar desenhos'}
        </button>
      </div>

      {resultado && (
        <>
          <div className="stats-bar">
            <div className="stat-card">
              <span className="stat-icon stat-icon-accent"><FiFile /></span>
              <div className="stat-card-body">
                <span className="stat-value">{resultado.importados}</span>
                <span className="stat-label">Arquivos importados</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon stat-icon-success"><FiLink /></span>
              <div className="stat-card-body">
                <span className="stat-value">{resultado.vinculados}</span>
                <span className="stat-label">Vinculados automaticamente</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon stat-icon-warning"><FiAlertTriangle /></span>
              <div className="stat-card-body">
                <span className="stat-value">{resultado.semVinculo}</span>
                <span className="stat-label">Sem vínculo (vincular manualmente)</span>
              </div>
            </div>
          </div>

          {resultado.arquivosSemVinculo.length > 0 && (
            <div className="import-review" style={{ margin: 0, marginBottom: 'var(--space-lg)' }}>
              <div className="import-review-title">Arquivos sem chicote correspondente</div>
              {resultado.arquivosSemVinculo.map((a, i) => (
                <div key={i}>{a.cliente} — <code>{a.arquivo}</code></div>
              ))}
            </div>
          )}

          {resultado.ignorados.length > 0 && (
            <div className="import-review" style={{ margin: 0 }}>
              <div className="import-review-title">Arquivos ignorados</div>
              {resultado.ignorados.map((ig, i) => (
                <div key={i}><code>{ig.arquivo}</code> — {ig.motivo}</div>
              ))}
            </div>
          )}
        </>
      )}

      <h2 className="op-detalhe-titulo secao-titulo">Enviar PDF (ou outro arquivo) avulso</h2>

      {mensagemAvulsos && <p className="erro">{mensagemAvulsos}</p>}

      <p className="import-desenhos-instrucoes">
        Envie um ou mais arquivos direto, sem precisar montar um .zip. O nome do arquivo (sem a
        extensão) precisa ser igual ao código do item do chicote. Se souber o cliente, selecione
        pra evitar ambiguidade; se deixar em branco, o sistema tenta achar sozinho pelo código —
        só vincula automático se o código bater com um único chicote na base.
      </p>

      <div className="import-uploader">
        <select value={clienteAvulso} onChange={(e) => setClienteAvulso(e.target.value)}>
          <option value="">— detectar cliente automaticamente pelo código —</option>
          {clientesExistentes.map((c) => (
            <option key={c.cliente} value={c.cliente}>{c.cliente}</option>
          ))}
        </select>
        <input
          type="file"
          multiple
          onChange={handleSelecionarAvulsos}
          id="import-arquivos-input"
        />
        <label htmlFor="import-arquivos-input" className="btn-editar">
          <FiUpload /> {arquivosAvulsos.length > 0 ? `${arquivosAvulsos.length} arquivo(s) selecionado(s)` : 'Escolher arquivo(s)'}
        </label>
        <button className="btn-adicionar-pedido" onClick={importarAvulsos} disabled={importandoAvulsos}>
          {importandoAvulsos ? 'Importando...' : 'Importar arquivo(s)'}
        </button>
      </div>

      {resultadoAvulsos && (
        <>
          <div className="stats-bar">
            <div className="stat-card">
              <span className="stat-icon stat-icon-accent"><FiFile /></span>
              <div className="stat-card-body">
                <span className="stat-value">{resultadoAvulsos.importados}</span>
                <span className="stat-label">Arquivos importados</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon stat-icon-success"><FiLink /></span>
              <div className="stat-card-body">
                <span className="stat-value">{resultadoAvulsos.vinculados}</span>
                <span className="stat-label">Vinculados automaticamente</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon stat-icon-warning"><FiAlertTriangle /></span>
              <div className="stat-card-body">
                <span className="stat-value">{resultadoAvulsos.semVinculo}</span>
                <span className="stat-label">Sem vínculo (vincular manualmente)</span>
              </div>
            </div>
          </div>

          {resultadoAvulsos.arquivosSemVinculo.length > 0 && (
            <div className="import-review" style={{ margin: 0 }}>
              <div className="import-review-title">Arquivos sem chicote correspondente</div>
              {resultadoAvulsos.arquivosSemVinculo.map((a, i) => (
                <div key={i}>{a.cliente} — <code>{a.arquivo}</code></div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
};

const ImportarChicotesPage = ({ setSidebarOpen }) => {
  const [aba, setAba] = useState('etapas');

  return (
    <>
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>Importar Arquivos</h1>
      </header>

      <div className="subtabs">
        <button className={`subtab ${aba === 'etapas' ? 'subtab-ativa' : ''}`} onClick={() => setAba('etapas')}>
          Importar Etapas
        </button>
        <button className={`subtab ${aba === 'desenhos' ? 'subtab-ativa' : ''}`} onClick={() => setAba('desenhos')}>
          Importar Desenhos
        </button>
      </div>

      {aba === 'etapas' ? <ImportarEtapasTab /> : <ImportarDesenhosTab />}
    </>
  );
};

export default ImportarChicotesPage;
