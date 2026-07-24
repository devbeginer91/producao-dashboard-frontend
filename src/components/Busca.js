import React from 'react';
import { FiSearch, FiDownload } from 'react-icons/fi';

const Busca = ({ busca, setBusca, carregarPedidos, todosPedidos, exportarPDF }) => {
  const filtrarPedidos = (lista) => {
    if (!busca) return lista;
    return lista.filter((pedido) =>
      pedido.empresa.toLowerCase().includes(busca.toLowerCase()) ||
      pedido.numeroOS.toLowerCase().includes(busca.toLowerCase())
    );
  };

  return (
    <div className="busca">
      <div className="busca-container">
        <div className="busca-input-wrapper">
          <FiSearch className="busca-icon" />
          <input
            type="text"
            id="buscaInput"
            name="buscaInput"
            placeholder="Buscar por Empresa ou Nº OS"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <button className="btn-exportar" onClick={exportarPDF}><FiDownload /> Exportar PDF</button>
      </div>
      {busca && (
        <ul className="lista-suspensa">
          {filtrarPedidos(todosPedidos).length > 0 ? (
            filtrarPedidos(todosPedidos).map((pedido) => (
              <li key={pedido.id}>
                {pedido.empresa} - {pedido.numeroOS} ({pedido.status})
              </li>
            ))
          ) : (
            <li>Nenhum pedido encontrado</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default Busca;