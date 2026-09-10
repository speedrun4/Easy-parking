export const environment = {
  production: true,
  // Production backend URL for mobile builds (HTTPS required).
  // Backend hospedado no Render.
  apiBaseUrl: 'https://easy-parking-f12s.onrender.com',
  pixKey: 'mourajuniorf@gmail.com',
  // Simulação de pagamento PIX desativada. O reconhecimento de pagamento é feito
  // automaticamente via consulta periódica (polling) do status no gateway Asaas.
  // Atenção: o Asaas ainda está configurado em modo Sandbox (ASAAS_BASE_URL aponta
  // para api-sandbox.asaas.com) — troque para a chave/URL de produção do Asaas
  // quando disponível para que o PIX seja pagável por um app de banco real.
  enablePixSimulation: false
};
