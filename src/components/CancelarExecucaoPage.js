import React, { useEffect, useRef, useState } from 'react';
import { FiMenu, FiUser, FiClock, FiAlertTriangle, FiX } from 'react-icons/fi';
import api from '../api';

const statusLabel = {
  em_andamento: 'Em andamento',
  pausado: 'Pausado',
};

const formatarCronometro = (segundos) => {
  const totalSegundos = Math.max(0, Math.round(segundos));
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const CancelarExecucaoPage = ({ setSidebarOpen }) => {
  const [execucoes, setExecucoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [, forcarTick] = useState(0);
  const referencias = useRef({});

  const carregar = () => {
    setCarregando(true);
    api.get('/execucoes-etapa/abertas')
      .then((r) => {
        setExecucoes(r.data);
        const mapa = {};
        r.data.forEach((ex) => {
          if (ex.status === 'em_andamento') {
            mapa[ex.id] = {
              baseSegundos: ex.tempoAcumuladoBase,
              referenciaInicio: new Date(ex.referenciaInicio).getTime(),
            };
          }
        });
        referencias.current = mapa;
      })
      .catch((e) => setMensagem('Erro ao carregar execuções: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const t = setInterval(() => forcarTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const tempoDeExecucao = (ex) => {
    if (ex.status !== 'em_andamento') return ex.tempoAcumuladoBase;
    const ref = referencias.current[ex.id];
    if (ref) return ref.baseSegundos + (Date.now() - ref.referenciaInicio) / 1000;
    return ex.tempoAcumuladoBase;
  };

  const cancelarExecucao = async (ex) => {
    const alvo = ex.orfao
      ? `a execução órfã de ${ex.colaboradorNome}`
      : `"${ex.etapaNome}" de ${ex.colaboradorNome} (${ex.empresa} — OS ${ex.numeroOS})`;
    if (!window.confirm(`Cancelar ${alvo}? O tempo registrado nessa execução é apagado e o colaborador fica livre pra iniciar outra etapa. Essa ação não pode ser desfeita.`)) return;
    try {
      await api.put(`/execucoes-etapa/${ex.id}/zerar`);
      carregar();
    } catch (error) {
      setMensagem('Erro ao cancelar: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <>
      <header className="topbar">
        {setSidebarOpen && (
          <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <FiMenu />
          </button>
        )}
        <h1>Cancelar Execução</h1>
      </header>

      <p className="import-desenhos-instrucoes">
        Lista qualquer etapa em andamento ou pausada no sistema, de qualquer colaborador — inclui
        execuções órfãs (etapa ou pedido que não existe mais, ex: depois de corrigir o vínculo de
        chicote de um item). Cancelar apaga o tempo dessa execução específica e libera o
        colaborador pra iniciar outra etapa.
      </p>

      {mensagem && <p className="erro">{mensagem}</p>}

      {carregando ? (
        <p className="loading">Carregando...</p>
      ) : execucoes.length === 0 ? (
        <p className="pedido-grid-empty">Nenhuma etapa em andamento ou pausada no momento.</p>
      ) : (
        <div className="op-itens-list">
          {execucoes.map((ex) => (
            <div key={ex.id} className={`op-item-row ${ex.orfao ? 'op-item-row-historico' : ''}`}>
              <span className="op-item-codigo">
                <FiUser /> {ex.colaboradorNome}
                {' · '}
                {statusLabel[ex.status] || ex.status}
                {ex.orfao && (
                  <>
                    {' · '}
                    <span className="erro"><FiAlertTriangle /> órfã (dados removidos)</span>
                  </>
                )}
                <br />
                {ex.orfao ? (
                  <span className="chicote-desenho-tamanho">
                    {ex.etapaNome ? ex.etapaNome : 'etapa removida'}
                    {' · '}
                    {ex.empresa ? `${ex.empresa} — OS ${ex.numeroOS} · ${ex.codigoDesenho}` : 'pedido não encontrado'}
                  </span>
                ) : (
                  <span className="chicote-desenho-tamanho">
                    {ex.etapaOrdem}. {ex.etapaNome} · {ex.empresa} — OS {ex.numeroOS} · {ex.codigoDesenho}
                  </span>
                )}
              </span>
              <span className="execucao-ativa-tempo"><FiClock /> {formatarCronometro(tempoDeExecucao(ex))}</span>
              <button type="button" className="btn-excluir" onClick={() => cancelarExecucao(ex)}>
                <FiX /> Cancelar
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default CancelarExecucaoPage;
