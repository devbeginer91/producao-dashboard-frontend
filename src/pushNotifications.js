import api from './api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const suportaPush = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const registrarServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js');
};

export const obterInscricaoAtual = async () => {
  if (!suportaPush()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (erro) {
    return null;
  }
};

export const ativarPush = async () => {
  if (!suportaPush()) {
    throw new Error(
      'Esse navegador não suporta notificações push. No iPhone: abra no Safari, toque em Compartilhar > Adicionar à Tela de Início, e ative por lá — não funciona direto no navegador.'
    );
  }
  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') {
    throw new Error('Permissão de notificação negada.');
  }
  const registration = await registrarServiceWorker();
  if (!registration) {
    throw new Error('Não foi possível registrar o service worker.');
  }
  const { data } = await api.get('/push/public-key');
  if (!data.publicKey) {
    throw new Error('O servidor ainda não tem push configurado.');
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey),
  });
  await api.post('/push/subscribe', subscription.toJSON());
  return subscription;
};

export const desativarPush = async () => {
  const subscription = await obterInscricaoAtual();
  if (!subscription) return;
  await api.post('/push/unsubscribe', { endpoint: subscription.endpoint }).catch(() => {});
  await subscription.unsubscribe();
};
