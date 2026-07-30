import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiMenu, FiArrowLeft, FiArrowUp, FiArrowDown, FiMinus } from 'react-icons/fi';
import api from '../api';
import { formatarDataHora } from '../utils';

const formatarCronometro = (segundos) => {
  if (segundos == null) return '—';
  const totalSegundos = Math.max(0, Math.round(segundos));
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const classificacaoInfo = {
  acima: { label: 'Acima', className: 'classificacao-acima', icon: <FiArrowUp /> },
  abaixo: { label: 'Abaixo', className: 'classificacao-abaixo', icon: <FiArrowDown /> },
  dentro: { label: 'Dentro', className: 'classificacao-dentro', icon: <FiMinus /> },
};

const RelatorioChicoteDetalhePage = ({ setSidebarOpen }) => {
  const { chicoteId } = useParams();
  const navigate = useNavigate();
  const [relatorio, setRelatorio] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    setCarregando(true);
    api.get(`/chicotes/${chicoteId}/relatorio-tempos`)
      .then((r) => setRelatorio(r.data))
      .catch((e) => setMensagem('Erro: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  }, [chicoteId]);

  return (
    <>
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>Tempos por Chicote</h1>
      </header>

      {relatorio && (
        <button
          className="op-voltar"
          onClick={() => navigate(`/relatorios/chicotes/${encodeURIComponent(relatorio.chicote.cliente)}`)}
        >
          <FiArrowLeft /> Voltar aos chicotes
        </button>
      )}

      {mensagem && <p className="erro">{mensagem}</p>}
      {carregando && <p className="loading">Carregando relatório...</p>}

      {!carregando && relatorio && (
        <>
          <h2 className="op-detalhe-titulo">{relatorio.chicote.cliente} — {relatorio.chicote.codigoItemCliente}</h2>

          <div className="relatorio-referencia-card">
            <span className="relatorio-referencia-label">Tempo de referência atual (por peça)</span>
            <strong className="relatorio-referencia-valor">
              {relatorio.chicote.tempoIdealSegundos != null
                ? formatarCronometro(relatorio.chicote.tempoIdealSegundos)
                : 'Não cadastrado'}
            </strong>
            {relatorio.chicote.tempoIdealSegundos != null && (
              <span className="relatorio-referencia-tolerancia">
                Tolerância de ±{relatorio.toleranciaPercentual}% pra classificar como "Dentro"
              </span>
            )}
          </div>

          {relatorio.execucoes.length === 0 ? (
            <p className="pedido-grid-empty">Nenhuma execução concluída registrada ainda para esse chicote.</p>
          ) : (
            <table className="tabela-itens">
              <thead>
                <tr>
                  <th>OS</th>
                  <th>Concluído em</th>
                  <th>Qtd</th>
                  <th>Tempo real (por peça)</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.execucoes.map((ex) => {
                  const info = ex.classificacao ? classificacaoInfo[ex.classificacao] : null;
                  return (
                    <tr key={ex.itemPedidoId}>
                      <td>{ex.empresa} — {ex.numeroOS}</td>
                      <td>{formatarDataHora(ex.dataConclusao)}</td>
                      <td>{ex.quantidadePedido}</td>
                      <td className="tabela-itens-tempo">{formatarCronometro(ex.tempoRealSegundos)}</td>
                      <td>
                        {info ? (
                          <span className={`classificacao-badge ${info.className}`}>{info.icon} {info.label}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
};

export default RelatorioChicoteDetalhePage;
