// src/utils.js
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