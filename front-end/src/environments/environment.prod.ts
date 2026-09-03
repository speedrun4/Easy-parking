export const environment = {
  production: true,
  // Production backend URL for mobile builds (HTTPS required).
  // Backend hospedado no Render.
  apiBaseUrl: 'https://easy-parking-f12s.onrender.com',
  pixKey: 'mourajuniorf@gmail.com',
  // O gateway Asaas ainda está em modo Sandbox (chave $aact_hmlg_...), então nenhum
  // código Pix gerado é pagável por um app de banco real. Enquanto isso, habilitamos
  // o botão "Simular pagamento" para permitir concluir o fluxo de testes no app.
  // Troque para false assim que migrar para a chave de produção do Asaas.
  enablePixSimulation: true
};
