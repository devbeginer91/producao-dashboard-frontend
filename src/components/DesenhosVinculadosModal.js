import React, { useEffect, useState } from 'react';
import api from '../api';
import { FiX, FiFile, FiDownload } from 'react-icons/fi';

const formatarTamanho = (bytes) => {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DesenhosVinculadosModal = ({ chicoteId, codigoDesenho, onClose }) => {
  const [desenhos, setDesenhos] = useState([]);
  const [carregando, setCarregando] = useState(!!chicoteId);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!chicoteId) return;
    setCarregando(true);
    setErro('');
    api.get('/desenhos', { params: { chicoteId } })
      .then((r) => setDesenhos(r.data))
      .catch((e) => setErro('Erro ao carregar desenhos: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  }, [chicoteId]);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2><FiFile /> Desenhos técnicos{codigoDesenho ? ` — ${codigoDesenho}` : ''}</h2>

        {!chicoteId ? (
          <p className="pedido-grid-empty">
            Este item ainda não está vinculado a um chicote elétrico. Vincule em "Chicotes Elétricos" pra ver os desenhos aqui.
          </p>
        ) : carregando ? (
          <p className="loading">Carregando desenhos...</p>
        ) : erro ? (
          <p className="erro">{erro}</p>
        ) : desenhos.length === 0 ? (
          <p className="pedido-grid-empty">Nenhum desenho técnico vinculado a esse chicote ainda.</p>
        ) : (
          <div className="op-itens-list">
            {desenhos.map((d) => (
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
              </div>
            ))}
          </div>
        )}

        <button type="button" className="btn-fechar-modal" onClick={onClose}>
          <FiX /> Fechar
        </button>
      </div>
    </div>
  );
};

export default DesenhosVinculadosModal;
