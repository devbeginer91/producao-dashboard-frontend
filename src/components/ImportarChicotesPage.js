import React, { useState } from 'react';
import { FiMenu, FiUpload, FiAlertTriangle, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import api from '../api';

const ImportarChicotesPage = ({ setSidebarOpen }) => {
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
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>Importar Etapas do Processo</h1>
      </header>

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

export default ImportarChicotesPage;
