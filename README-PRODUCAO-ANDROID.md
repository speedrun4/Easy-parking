# Guia Completo: Deploy do Easy Parking no Android - Produção

## 📋 Visão Geral

Este guia mostra como colocar o app Easy Parking em produção no seu Android, incluindo:
- Build otimizado do Angular
- Geração de APK assinado
- Instalação no dispositivo
- Configuração para usar o backend em produção

---

## 🚀 Pré-requisitos

### Instalações Obrigatórias

1. **Node.js 14+**
   - Baixe em: https://nodejs.org/
   - Verifique: `node --version`

2. **Java JDK 8+**
   - Baixe em: https://www.java.com/ ou https://www.oracle.com/java/
   - Verifique: `java -version`

3. **Android Studio**
   - Baixe em: https://developer.android.com/studio
   - Instala automaticamente: Android SDK, Emulador, Gradle

4. **Configurar ANDROID_HOME (Windows)**
   ```powershell
   # Adicione ao seu Path do Sistema:
   # Variável de ambiente: ANDROID_HOME
   # Valor: C:\Users\SEU_USER\AppData\Local\Android\Sdk
   
   # Verifique:
   $env:ANDROID_HOME
   ```

---

## 📱 Passo 1: Configurar a URL do Backend

Edite o arquivo `front-end/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  // Opção 1: IP da máquina local (se backend está rodando no PC)
  apiBaseUrl: 'http://192.168.0.175:8080',  // Ajuste para seu IP local
  
  // Opção 2: IP da instância AWS EC2 (se backend está na nuvem)
  // apiBaseUrl: 'http://18.230.187.108:8080',
  
  // Opção 3: Domínio com HTTPS (recomendado para produção)
  // apiBaseUrl: 'https://api.seu-dominio.com.br',
  
  pixKey: 'mourajuniorf@gmail.com'
};
```

**Importante:**
- O Android não consegue acessar `localhost`
- Use o IP local se o backend está na sua rede (LAN)
- Use o IP públic/domínio se o backend está na nuvem

---

## 🔧 Passo 2: Preparar o Build

### 2.1 Navegar até o diretório front-end

```powershell
cd front-end
```

### 2.2 Instalar Dependências

```powershell
npm install --legacy-peer-deps
```

### 2.3 Fazer Build do Angular (Produção)

```powershell
npm run build
```

Isso gera a pasta `dist/easy-parking/` com os assets web otimizados.

### 2.4 Sincronizar com Capacitor

```powershell
npx cap sync android
```

Isso copia os assets web gerados para o projeto nativo Android.

---

## 🔑 Passo 3: Criar/Usar Keystore para Assinatura

Um keystore é necessário para assinar o APK antes de publicar.

### 3.1 Primeira Vez: Criar um Novo Keystore

Use o script automático:

```powershell
.\build-android-apk.ps1
```

Ou crie manualmente:

```powershell
cd front-end\android\app

keytool -genkey -v -keystore easy-parking-release.keystore ^
  -keyalg RSA -keysize 2048 -validity 10000 ^
  -alias easy-parking-key -storepass sua_senha_aqui
```

**Salve em local seguro:**
- Caminho: `front-end/android/app/easy-parking-release.keystore`
- Senha do keystore: `sua_senha_aqui`
- Alias: `easy-parking-key`
- Senha do alias: `sua_senha_aqui` (pode ser a mesma)

⚠️ **Nunca perca o keystore!** Sem ele, não conseguirá atualizar o app na Play Store.

---

## 📦 Passo 4: Gerar o APK Assinado

### 4.1 Método Automático (Recomendado)

Execute o script no diretório raiz:

```powershell
.\build-android-apk.ps1
```

Este script:
1. ✅ Verifica pré-requisitos (Node, Java, Android SDK)
2. ✅ Instala dependências NPM
3. ✅ Faz build do Angular
4. ✅ Sincroniza com Capacitor
5. ✅ Verifica/Cria keystore
6. ✅ Abre Android Studio

### 4.2 Método Manual (Android Studio)

Após rodar o script (que abre Android Studio):

1. **Abra Android Studio** (se não abrir automaticamente)
   ```powershell
   npx cap open android
   ```

2. **Aguarde Gradle terminar de sincronizar** (primeira vez demora ~5 min)

3. **Gerar Signed APK:**
   - Menu: `Build` → `Generate Signed Bundle / APK`
   - Selecione: `APK`
   - Clique: `Next`

4. **Configurar Keystore:**
   - Key store path: `android/app/easy-parking-release.keystore`
   - Key store password: `sua_senha_aqui`
   - Key alias: `easy-parking-key`
   - Key password: `sua_senha_aqui`
   - Clique: `Next`

5. **Configurar Build:**
   - Build Variant: `release`
   - Signature Version: `V2 (Full APK Signature)`
   - Clique: `Finish`

6. **Aguardar Geração:**
   - Vai levar ~2-5 minutos
   - Quando terminar, localize o arquivo:
     ```
     front-end\android\app\release\app-release.apk
     ```

---

## 📲 Passo 5: Instalar o APK no Android

### 5.1 Via Transferência de Arquivo

1. **Copie o APK para seu Android:**
   - Transfira via USB, email ou cloud
   - Arquivo: `app-release.apk`

2. **Instale no dispositivo:**
   - Abra o gerenciador de arquivos
   - Localize o `app-release.apk`
   - Toque no arquivo
   - Será solicitado: "Deseja instalar este aplicativo?"
   - Se pedir permissão: `Configurações` → `Segurança` → `Permitir instalação de fontes desconhecidas`
   - Toque: `Instalar`

### 5.2 Via ADB (Mais Rápido)

Se tem o Android Studio e um dispositivo/emulador conectado:

```powershell
# Conectar dispositivo via USB e ativar "Depuração USB"
cd front-end\android

# Instalar APK
adb install app\release\app-release.apk

# Ou forçar reinstalação:
adb install -r app\release\app-release.apk
```

---

## ✅ Passo 6: Testar o App

Após instalar:

1. **Abra o app**
   - Procure por "Easy Parking" na tela inicial

2. **Teste a Conexão:**
   - Abra o app
   - Tente fazer login
   - Verifique se conecta ao backend

3. **Problemas Comuns:**

   | Problema | Solução |
   |----------|---------|
   | "Falha de conexão" | Verifique se o backend está rodando e o IP está correto |
   | "Certificado inválido" (HTTPS) | Para desenvolvimento, use HTTP. Para produção, configure HTTPS |
   | "Permissão de câmera negada" | Toque: `Configurações` → `Permissões` → Conceda acesso à câmera |
   | "Localização não funciona" | Toque: `Configurações` → `Permissões` → Conceda acesso à localização |

---

## 🌐 Backend em Produção

### Opção 1: Backend Local (Rede LAN)

1. **Inicie o backend:**
   ```powershell
   cd back-end
   mvn clean package -DskipTests
   java -Dspring.profiles.active=prod -jar target/easy-parking.jar
   ```

2. **Descubra seu IP local:**
   ```powershell
   ipconfig
   # Procure por: IPv4 Address (ex.: 192.168.0.175)
   ```

3. **Configure em `environment.prod.ts`:**
   ```typescript
   apiBaseUrl: 'http://192.168.0.175:8080'
   ```

4. **Certifique-se que:**
   - Backend está rodando na porta 8080
   - Firewall permite conexão na porta 8080
   - Android está na mesma rede WiFi

### Opção 2: Backend na AWS EC2 (Nuvem)

1. **Execute o script de deploy:**
   ```powershell
   .\deploy-production.ps1
   ```

2. **Configure em `environment.prod.ts`:**
   ```typescript
   apiBaseUrl: 'http://18.230.187.108:8080'
   // ou com domínio:
   // apiBaseUrl: 'https://api.seu-dominio.com.br'
   ```

3. **Importante:**
   - Security Group do EC2 deve permitir porta 8080
   - Se usar HTTPS, configure certificado SSL

---

## 📊 Checklist de Produção

- [ ] URL do backend em `environment.prod.ts` está correta
- [ ] Backend está rodando e acessível
- [ ] Keystore foi criado e salvo em local seguro
- [ ] APK foi gerado e assinado
- [ ] APK foi testado no Android
- [ ] Câmera funciona para validar QR codes
- [ ] Localização funciona para mostrar mapa
- [ ] Login funciona e conecta ao backend
- [ ] Transações de pagamento funcionam

---

## 🔐 Segurança & Boas Práticas

1. **Nunca committe o keystore no Git:**
   ```
   # .gitignore
   *.keystore
   *.jks
   ```

2. **Use HTTPS em Produção:**
   - Configure domínio com SSL/TLS
   - Use `https://` em `environment.prod.ts`

3. **Proteja as Senhas:**
   - Use um gerenciador de senhas
   - Não compartilhe as senhas do keystore

4. **Versioning:**
   - Aumente `versionCode` em `android/app/build.gradle` para cada build
   - Exemplo:
     ```gradle
     versionCode 1  // Próximo será 2, 3, etc
     versionName "1.0"  // Próximo será "1.1", "2.0", etc
     ```

5. **Atualizações:**
   - Sempre teste em um dispositivo antes de publicar
   - Mantenha backups do keystore

---

## 📚 Documentação Relacionada

- [README-mobile.md](../front-end/README-mobile.md) - Desenvolvimento mobile
- [DEPLOYMENT-GUIDE-AWS.md](../DEPLOYMENT-GUIDE-AWS.md) - Deploy do backend na AWS
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Arquitetura geral

---

## 🆘 Troubleshooting

### Erro: "Android SDK não encontrado"
```powershell
# Configure a variável de ambiente:
$env:ANDROID_HOME = "C:\Users\SEU_USER\AppData\Local\Android\Sdk"

# Ou abra Android Studio:
# Tools → SDK Manager → Copie o caminho do Android SDK Location
```

### Erro: "keytool não reconhecido"
```powershell
# Use o keytool do Java:
"$env:JAVA_HOME\bin\keytool.exe" -genkey -v ...
```

### Erro: "Gradle build failed"
```powershell
# Limpe o cache do Gradle:
cd front-end\android
./gradlew clean
cd ..
npx cap sync android
```

### App não conecta ao backend
```powershell
# Teste a conexão:
ping 192.168.0.175
curl http://192.168.0.175:8080/

# Se não funcionar:
# - Verifique o IP correto (ipconfig)
# - Verifique se o backend está rodando
# - Verifique firewall/antivírus bloqueando
```

---

## ✨ Próximos Passos

1. **Publicar na Play Store** (opcional):
   - Crie conta Google Play Developer ($25 USD one-time)
   - Faça upload do APK signed
   - Configure store listing, screenshots, descrição

2. **Distribuição Beta:**
   - Use Google Play Internal Testing Track
   - Convide usuários para testar antes do lançamento

3. **CI/CD:**
   - Configure GitHub Actions para automatizar builds
   - Faça deploy automático ao fazer push

---

**Última atualização:** 2026-08-05
**Autor:** Easy Parking Team
**Contato:** support@easyparking.com.br
