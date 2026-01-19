# Integração PagBank (PagSeguro) - Easy-parking

Este documento descreve como configurar e usar a integração com o PagBank para pagamentos PIX, cartão de crédito e débito.

## Configuração

Edite `back-end/src/main/resources/application.properties`:

- Ambiente de testes
  - `pagbank.sandbox=true`
- OAuth client credentials (recomendado em produção)
  - `pagbank.client_id=SEU_CLIENT_ID`
  - `pagbank.client_secret=SEU_CLIENT_SECRET`
- Token de integração (fallback)
  - `pagbank.token=SEU_TOKEN_DE_TESTE`
- Webhook de notificações
  - `pagbank.notification_url=http://SEU_HOST/api/pagbank/notifications`

> Em produção, use HTTPS e um host público. No sandbox é possível usar um túnel como ngrok.

## Rodando

Backend (Spring Boot):

```powershell
cd "c:\Users\Familia Moura\Easy-parking\back-end"
mvn spring-boot:run
```

Frontend (Angular):

```powershell
cd "c:\Users\Familia Moura\Easy-parking\front-end"
npm install
npm run start
```

## Endpoints

### Criar compra (charge) com PagBank

`POST /api/pagbank/purchase`

Body exemplos:

- PIX
```json
{
  "method": "PIX",
  "amount": 10.5,
  "description": "Reserva de vaga A12",
  "referenceId": "ORDER-1001",
  "usuarioId": 1,
  "productName": "Vaga A12"
}
```

- Crédito
```json
{
  "method": "CREDIT_CARD",
  "amount": 10.5,
  "description": "Reserva de vaga A12",
  "referenceId": "ORDER-1002",
  "usuarioId": 1,
  "productName": "Vaga A12",
  "card": {
    "number": "4111111111111111",
    "exp_month": "12",
    "exp_year": "2030",
    "security_code": "123",
    "holder": { "name": "Fulano de Tal", "tax_id": "00000000000" }
  }
}
```

Resposta: `{ "charge": { ... }, "paymentId": 123, "paymentStatus": "aguardando_pagamento|pago" }`

> Observações:
> - Em produção, use tokenização no cliente para dados de cartão (PCI), enviando apenas o token ao backend.
> - Em PIX, a resposta inclui `qr_code.base64` e `qr_code.text` para exibir ao usuário.

### Fluxo PIX com Pagamentos local

- Criar pagamento local
  `POST /api/pagamentos` (formaPagamento="PIX")
- Criar cobrança PIX
  `POST /api/pagamentos/{id}/pagbank/pix`
- Consultar status
  `GET /api/pagamentos/{id}/pagbank/status`

### Webhook de notificações

`POST /api/pagbank/notifications`

- Atualiza status do pagamento local, quando o `reference_id` inclui o ID (ex.: `PAY-<id>`).
- Configure `pagbank.notification_url` para que o PagBank envie as notificações.

## Angular

Serviço: `front-end/src/app/services/pagbank.service.ts`

Exemplo (PIX):
```ts
this.pagbank.createPurchase({
  method: 'PIX',
  amount: 10.5,
  description: 'Reserva de vaga A12',
  referenceId: 'ORDER-1001',
  usuarioId: 1,
  productName: 'Vaga A12'
}).subscribe(res => {
  const charge = (res as any).charge;
  const qr = charge?.qr_code;
  const qrBase64 = qr?.base64;
  const qrText = qr?.text;
});
```

Exemplo (Cartão crédito):
```ts
this.pagbank.createPurchase({
  method: 'CREDIT_CARD',
  amount: 10.5,
  description: 'Reserva de vaga A12',
  referenceId: 'ORDER-1002',
  usuarioId: 1,
  productName: 'Vaga A12',
  card: {
    number: '4111111111111111',
    exp_month: '12',
    exp_year: '2030',
    security_code: '123',
    holder: { name: 'Fulano de Tal', tax_id: '00000000000' }
  }
}).subscribe(res => {
  const status = (res as any)?.charge?.status;
});
```

## Dicas

- Sempre use `referenceId` único por transação.
- Converta valores em BRL para centavos no backend (já implementado).
- Para produção, desative sandbox e configure OAuth.
- Para notificações, valide origem/assinatura se disponível e registre logs.
