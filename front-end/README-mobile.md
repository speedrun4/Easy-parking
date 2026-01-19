# Easy Parking (Mobile)

Este guia explica como gerar e rodar o app Android e iOS usando Capacitor.

## Pré-requisitos
- Node.js 14+ (o projeto Angular 12 funciona bem com Node 14)
- Java 11+ e Android Studio (SDK/Emulador)
- Para iOS: macOS + Xcode (iOS só compila/roda em Mac)

## 1) Configurar a URL do backend
O app mobile não consegue acessar `localhost` do seu PC. Ajuste a URL base da API em:

- `src/environments/environment.ts` (desenvolvimento web)
- `src/environments/environment.prod.ts` (build para mobile/produção)

Valores sugeridos:
- Emulador Android: `http://10.0.2.2:8080`
- Dispositivo físico: `http://SEU-IP-LAN:8080` (ex.: `http://192.168.0.10:8080`)

Exemplo (`environment.prod.ts`):
```ts
export const environment = {
  production: true,
  apiBaseUrl: 'http://10.0.2.2:8080'
};
```

## 2) Instalar dependências e Capacitor
No diretório `front-end/`:

```powershell
npm install
npm install @capacitor/core@4 @capacitor/android@4 @capacitor/ios@4 -E --legacy-peer-deps
npm install -D @capacitor/cli@4 -E --legacy-peer-deps
```

> Observação: usamos Capacitor v4 para compatibilidade com o stack atual (Angular 12 / Node 14).

## 3) Build do Angular e sincronização
Gere os assets Web e copie para o projeto nativo:

```powershell
npm run build
npx cap sync android
```

## 4) Android
- Abra o projeto nativo:

```powershell
npx cap open android
```

- Se precisar de HTTP sem TLS (para `http://`), já habilitamos no AndroidManifest: `usesCleartextTraffic=true` e `networkSecurityConfig`. 
- O app solicita permissões de Câmera e Localização (QR code e mapas). Conceda-as ao testar.

Execute pelo Android Studio em um emulador ou dispositivo físico.

## 5) iOS (somente macOS)
No Mac, dentro de `front-end/`:

```bash
npx cap add ios
npm run build
npx cap sync ios
npx cap open ios
```

No Xcode, defina as "Signing & Capabilities" e rode no simulador ou dispositivo. Adicione descrições de uso no `Info.plist` se necessário:
- `NSCameraUsageDescription`
- `NSLocationWhenInUseUsageDescription`

## Dicas
- Alterou algo no Angular? Rode `npm run build` e `npx cap sync` novamente.
- Backend local precisa estar acessível pelo IP configurado em `apiBaseUrl`.
- Se for publicar, troque `apiBaseUrl` para o domínio HTTPS do backend em produção.

## Validação de Entrada via QR 📷

- A opção de menu "Validar Entrada" abre a câmera e escaneia o QR do cliente.
- Ao ler o QR, o app chama o endpoint `POST /api/pagamentos/qrcodes/consume-by-token?token=...`.
- Regras de validação implementadas no backend:
  - Pagamento deve estar com status `pago`.
  - A leitura deve ocorrer dentro da janela agendada: entre `dataReservaEntrada + horarioReservaEntrada` e `dataReservaEntrada + horarioReservaSaida`.
  - O QR deve estar ativo (não consumido/expirado).
  - Mensagens de erro retornam motivos: "A reserva ainda não começou", "A reserva já expirou", "Pagamento não está pago", etc.

Notas e próximos passos recomendados:
- Autenticação: proteger o consumo de QR para apenas usuários do estacionamento (cliente/portaria) com login.
- Vincular QR ao estacionamento correto e rejeitar validação em outro local.
- Considerar tolerâncias de horário (ex.: 5–10 min de tolerância) e fuso horário do estacionamento.
