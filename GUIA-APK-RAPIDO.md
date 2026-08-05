# Easy Parking - Gerar APK SEM Android Studio

## Solucao: Usar Gradle CLI

Voce nao precisa instalar Android Studio! Use Gradle direto.

## O que voce precisa instalar

### 1. Node.js
- Baixe: https://nodejs.org/ (versao LTS)
- Instale normalmente
- Verifique: `node --version`

### 2. Java JDK
- Baixe: https://www.oracle.com/java/technologies/javase-jdk11-downloads.html
- Instale
- Verifique: `java -version`

Pronto! Nao precisa de mais nada!

## Como Usar

### Passo 1: Configurar URL do Backend

Abra: `front-end\src\environments\environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'http://192.168.0.175:8080',  // Seu IP local ou AWS
  pixKey: 'mourajuniorf@gmail.com'
};
```

### Passo 2: Executar o Script

1. Abra PowerShell
2. Va para a pasta do projeto:
   ```powershell
   cd "C:\Users\francisj\projeto pessoal\Easy-parking"
   ```
3. Execute:
   ```powershell
   .\build-android-apk.ps1
   ```

### Passo 3: Seguir as Instrucoes

O script vai:
1. Instalar dependencias NPM
2. Fazer build do Angular
3. Sincronizar com Capacitor
4. Perguntar senha para keystore (novo ou existente)
5. Gerar APK automaticamente

Pronto! Apos alguns minutos, tera um APK pronto.

## Onde Fica o APK

```
front-end\android\app\release\app-release.apk
```

## Como Instalar no Android

### Opcao 1: Transferir Arquivo
1. Copie `app-release.apk` para seu celular (via email, WhatsApp, etc)
2. Abra o arquivo no celular
3. Toque "Instalar"
4. Conceda permissoes

### Opcao 2: Usar ADB (Mais Rapido)

Se tiver o Java instalado:

```powershell
# Conecte o celular via USB e ative "Depuracao USB"
cd "front-end\android"
# Depois copie o APK gerado:
adb install "app\release\app-release.apk"
```

## Perguntas Frequentes

### "Java nao encontrado"
- Instale de: https://www.oracle.com/java/
- Reinicie PowerShell

### "Gradle build failed"
- Delete as pastas:
  - `front-end\.gradle`
  - `front-end\android\.gradle`
- Execute novamente

### "Onde ficou o APK?"
```
front-end\android\app\release\app-release.apk
```

### "Posso usar um keystore antigo?"
Sim! Na primeira execucao, o script vai encontrar o arquivo:
```
front-end\android\app\easy-parking.keystore
```

E vai pedir a senha. Use a mesma senha que criou antes.

### "App nao conecta ao backend"
1. Verifique o IP em `environment.prod.ts`
2. Verifique se o backend esta rodando
3. Teste no PC: `curl http://SEU_IP:8080/`

## Resumo

- Instale: Node.js + Java
- Execute: `.\build-android-apk.ps1`
- Aguarde: 5-10 minutos
- Pronto: Transferir `app-release.apk` para o Android
- Instalar: Abrir arquivo no celular

Facil assim! 🚀

