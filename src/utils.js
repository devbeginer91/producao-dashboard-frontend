// src/utils.js
export const isPastDue = (previsaoEntrega, status) => {
  if (!previsaoEntrega || status === 'concluido') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(previsaoEntrega);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
};

export const filtrarPedidosPorBusca = (lista, busca) => {
  if (!busca) return lista;
  const termo = busca.toLowerCase();
  return lista.filter((pedido) =>
    pedido.empresa.toLowerCase().includes(termo) ||
    pedido.numeroOS.toLowerCase().includes(termo)
  );
};

export const formatarDataHora = (data) => {
    if (!data || typeof data !== 'string' || data.includes('undefined')) {
      return 'Não informado';
    }
    const parsedDate = new Date(data);
    if (isNaN(parsedDate)) {
      return 'Não informado';
    }
    return parsedDate.toLocaleString('pt-BR', { 
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };