import React, { useCallback } from 'react';
import debounce from 'lodash/debounce'; // Necessita instalar lodash

const Busca = ({ busca, setBusca, carregarPedidos, todosPedidos, exportarPDF }) => {
  const filtrarPedidos = (lista) => {
    if (!busca) return lista;
    return lista.filter((pedido) =>
      pedido.empresa.toLowerCase().includes(busca.toLowerCase()) ||
      pedido.numeroOS.toLowerCase().includes(busca.toLowerCase())
    );
  };

  const handleBuscaChange = useCallback(
    debounce((value) => setBusca(value), 300),
    [setBusca]
  );

  return (
    <div className="busca">
      <div className="busca-container">
        <input
          type="text"
          id="buscaInput"
          name="buscaInput"
          placeholder="Buscar por Empresa ou Nº OS"
          value={busca}
          onChange={(e) => handleBuscaChange(e.target.value)}
        />
        <button className="btn-exportar" onClick={exportarPDF}>Exportar PDF</button>
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