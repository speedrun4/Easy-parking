# Integração Asaas (PIX e Cartão) - Easy-parking

Este documento descreve como configurar e usar a integração de pagamentos do Easy Parking.

- PIX: Asaas.
- Cartão de crédito/débito: Asaas (processamento no endpoint `/api/asaas/purchase`).

## Configuração

Edite `back-end/src/main/resources/application.properties`:

- Asaas para PIX
  - `asaas.api-key=$aact_YOUR_KEY`
  - `asaas.base-url=https://sandbox.asaas.com/api/v3` (sandbox)
  - `asaas.base-url=https://api.asaas.com/v3` (produção)
  - `asaas.notification-url=https://SEU_HOST/api/asaas/notifications`
  - `asaas.card.default-remote-ip=127.0.0.1` (fallback para processamento de cartão)
  - `asaas.card.default-postal-code=00000000` (fallback titular)
  - `asaas.card.default-address-number=0` (fallback titular)

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

### Criar compra (charge)

`POST /api/asaas/purchase`

Body exemplos:

- PIX (Asaas)
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

- Cartão (Asaas: crédito e débito)
```json
{
  "method": "CREDIT_CARD",
  "amount": 20.0,
  "description": "Reserva de vaga B20",
  "referenceId": "ORDER-1002",
  "usuarioId": 1,
  "card": {
    "number": "4111111111111111",
    "exp_month": "12",
    "exp_year": "2030",
    "security_code": "123",
    "holder": {
      "name": "Fulano da Silva",
      "tax_id": "12345678909"
    }
  }
}
```

Resposta: `{ "charge": { ... }, "paymentId": 123, "paymentStatus": "aguardando_pagamento|pago" }`

> Observações:
> - Em produção, use tokenização no cliente para dados de cartão (PCI), enviando apenas o token ao backend.
> - Em PIX via Asaas, a resposta inclui payload e imagem do QR quando a cobrança é criada.
> - O backend persiste os dados do QR no pagamento local e mantém o formato atual de resposta para o front.

### Fluxo PIX com Pagamentos local

- Criar pagamento local
  `POST /api/pagamentos` (formaPagamento="PIX")
- Criar cobrança PIX
  `POST /api/pagamentos/{id}/asaas/pix`
- Consultar status
  `GET /api/pagamentos/{id}/asaas/status`

### Webhook de notificações

`POST /api/asaas/notifications`

- Atualiza status do pagamento local quando a referência inclui o ID (ex.: `PAY-<id>`).
- Configure `asaas.notification-url` com uma URL HTTPS pública.

> Compatibilidade temporária: os endpoints antigos em `/api/pagbank/...` e `/api/pagamentos/{id}/pagbank/...` continuam aceitos.

## Angular

Serviço: `front-end/src/app/services/asaas.service.ts`

Exemplo (PIX):
```ts
this.asaasService.createPurchase({
  method: 'PIX',
  amount: 10.5,
  description: 'Reserva de vaga A12',
  referenceId: 'ORDER-1001',
  usuarioId: 1,
  productName: 'Vaga A12'
}).subscribe(res => {
  const charge = (res as any).charge;
  const pix = charge?.pixTransaction;
  const qrBase64 = pix?.encodedImage;
  const qrText = pix?.payload;
});
```

## Dicas

- Sempre use `referenceId` único por transação.
- Converta valores em BRL para centavos no backend (já implementado).
- Para produção, use `asaas.base-url=https://api.asaas.com/v3`.
- Para notificações, valide origem/assinatura se disponível e registre logs.
