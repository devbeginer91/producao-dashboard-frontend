import React, { useEffect, useRef, useState } from 'react';
import { FiActivity, FiUser } from 'react-icons/fi';
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

const agruparPorOs = (execucoes) => {
  const porOs = new Map();
  execucoes.forEach((exec) => {
    const chaveOs = `${exec.empresa}__${exec.numeroOS}`;
    if (!porOs.has(chaveOs)) {
      porOs.set(chaveOs, { empresa: exec.empresa, numeroOS: exec.numeroOS, itens: new Map() });
    }
    const os = porOs.get(chaveOs);
    if (!os.itens.has(exec.codigoDesenho)) {
      os.itens.set(exec.codigoDesenho, []);
    }
    os.itens.get(exec.codigoDesenho).push(exec);
  });
  return Array.from(porOs.values()).map((os) => ({
    ...os,
    itens: Array.from(os.itens.entries()).map(([codigoDesenho, execs]) => ({
      codigoDesenho,
      chicoteId: execs[0]?.chicoteId,
      execucoes: [...execs].sort((a, b) => a.etapaOrdem - b.etapaOrdem),
    })),
  }));
};

const ExecucoesAtivasPanel = () => {
  const [execucoes, setExecucoes] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [, forcarTick] = useState(0);
  const referencias = useRef({});
  const [desenhosModalItem, setDesenhosModalItem] = useState(null);

  const carregar = () => {
    api.get('/execucoes-etapa/ativas')
      .then((r) => {
        setExecucoes(r.data);
        const mapa = {};
        r.data.forEach((exec) => {
          mapa[exec.id] = {
            baseSegundos: exec.tempoAcumuladoBase,
            referenciaInicio: new Date(exec.referenciaInicio).getTime(),
          };
        });
        referencias.current = mapa;
      })
      .catch(() => {})
      .finally(() => setCarregado(true));
  };

  useEffect(() => {
    carregar();
    const poll = setInterval(carregar, 30000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => forcarTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const tempoAtual = (exec) => {
    const ref = referencias.current[exec.id];
    if (!ref) return exec.tempoAcumuladoBase;
    return ref.baseSegundos + (Date.now() - ref.referenciaInicio) / 1000;
  };

  if (!carregado || execucoes.length === 0) return null;

  const ordens = agruparPorOs(execucoes);

  return (
    <div className="execucoes-ativas-panel">
      <h2 className="secao-titulo"><FiActivity /> Em Execução Agora</h2>
      <div className="execucoes-ativas-grid">
        {ordens.map((os) => (
          <div key={`${os.empresa}__${os.numeroOS}`} className="execucao-ativa-card">
            <div className="execucao-ativa-header">
              <span className="execucao-ativa-empresa">{os.empresa}</span>
              <span className="execucao-ativa-os">OS {os.numeroOS}</span>
            </div>
            {os.itens.map((item) => (
              <div key={item.codigoDesenho} className="execucao-ativa-item-grupo">
                <button
                  type="button"
                  className="btn-codigo-desenho execucao-ativa-item"
                  onClick={() => setDesenhosModalItem(item)}
                  title="Ver desenhos técnicos vinculados"
                >
                  {item.codigoDesenho}
                </button>
                {item.execucoes.map((exec) => (
                  <div key={exec.id} className="execucao-ativa-etapa-linha">
                    <span className="execucao-ativa-etapa">{exec.etapaOrdem}. {exec.etapaNome}</span>
                    <span className="execucao-ativa-colaborador"><FiUser /> {exec.colaboradorNome}</span>
                    <span className="execucao-ativa-tempo">{formatarCronometro(tempoAtual(exec))}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {desenhosModalItem && (
        <DesenhosVinculadosModal
          chicoteId={desenhosModalItem.chicoteId}
          codigoDesenho={desenhosModalItem.codigoDesenho}
          onClose={() => setDesenhosModalItem(null)}
        />
      )}
    </div>
  );
};

export default ExecucoesAtivasPanel;
