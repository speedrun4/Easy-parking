import { Component, OnDestroy, OnInit } from '@angular/core';
import { Carteira } from 'src/app/models/carteira.model';
import { CarteiraService } from 'src/app/services/carteira.service';
import { PagBankService } from 'src/app/services/pagbank.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-carteira',
  templateUrl: './carteira.component.html',
  styleUrls: ['./carteira.component.scss']
})
export class CarteiraComponent implements OnInit, OnDestroy {

  carteira: Carteira = { saldo: 0, historicoTransacoes: [] };
  valorOperacao: number = 0;
  valorOperacaoDisplay: string = '';
  descricaoOperacao: string = '';
  mostrarModal: boolean = false;
  metodoSelecionado: string | null = null;
  isLoading: boolean = false; // Estado de loading
  nomeLoja: string = "Easy-Parking"; // Nome da loja
  cidade: string = "Barueri"; // Nome da cidade

  chavePix = '05121324456';

  dadosCartao = {
    nome: ''
  };

  qrCodeSrc: string = '';
  codigoPix: string = '';
  private stripe: any;
  private stripeCardElement: any;
  private stripeCardHost: HTMLElement | null = null;
  private stripeCardComplete: boolean = false;
  private stripeCardError: string = '';
  private backendStripePublicKey: string = '';
  private stripePublicKeyLookupAttempted: boolean = false;
  private stripeInitializedPublicKey: string = '';

  constructor(private carteiraService: CarteiraService, private pagBankService: PagBankService) { }

  ngOnInit(): void {
    if (this.metodoSelecionado === 'pix') {
      this.gerarQRCodePIX();
    }
    this.carteira = this.carteiraService.obterCarteira();
  }

  abrirModal() {
    if (this.valorOperacao <= 0) {
      alert('Informe um valor maior que zero para adicionar na carteira.');
      return;
    }
    this.mostrarModal = true;
  }

  fecharModal() {
    this.mostrarModal = false;
    this.metodoSelecionado = null;
    this.resetarDadosPagamento();
  }

  selecionarMetodo(metodo: string) {
    this.metodoSelecionado = metodo;
    if (metodo === 'pix') {
      this.gerarQRCodePIX();
      return;
    }

    if (metodo === 'cartao') {
      setTimeout(() => {
        this.initializeStripeCardElement().catch((error) => {
          console.error('Erro ao montar o campo do cartão Stripe na carteira:', error);
          alert(this.normalizeStripeErrorMessage(error));
        });
      }, 0);
    }
  }

  
  gerarQRCodePIX() {
    const payload = this.montarPayloadPix();  // Monta o payload do PIX
    QRCode.toDataURL(payload, { width: 300, margin: 1 }, (err, url) => {  // Gera o QR Code
      if (err) {
        console.error('Erro ao gerar QR Code', err);
      } else {
        this.qrCodeSrc = url;  // Define a URL do QR Code gerado
        this.codigoPix = payload; // Define o código PIX gerado
      }
    });
  }


  montarPayloadPix(): string {
    const valorFormatado = (this.valorOperacao * 100).toString(); // Valor em centavos
    return `00020101021126580014BR.GOV.BCB.PIX0114${this.chavePix}520400005303986540${valorFormatado}5802BR5908${this.nomeLoja}6009${this.cidade}62070503***6304`;
  }

  confirmarPagamento() {
    if (!this.metodoSelecionado) {
      alert('Selecione um método de pagamento.');
      return;
    }

    if (this.metodoSelecionado === 'cartao') {
      this.processarPagamentoComStripe();
      return;
    }

    this.simularPagamento();
  }

  async processarPagamentoComStripe() {
    const stripePublicKey = await this.ensureStripePublicKeyLoaded();
    if (!stripePublicKey) {
      alert('Falta configurar STRIPE_PUBLIC_KEY no servidor para habilitar pagamento por cartão.');
      return;
    }

    try {
      this.isLoading = true;
      await this.ensureStripeCardElement();

      const stripeIntent = await this.pagBankService.createStripePaymentIntent({
        amount: Number(this.valorOperacao.toFixed(2)),
        description: this.descricaoOperacao || 'Recarga da carteira Easy Parking',
        customerName: this.dadosCartao.nome || 'Cliente Easy Parking',
        paymentMethod: 'CREDIT_CARD'
      }).toPromise();

      if (!stripeIntent || !stripeIntent.clientSecret) {
        throw new Error(stripeIntent?.message || 'Não foi possível iniciar o pagamento do cartão.');
      }

      const intentPublicKey = String(stripeIntent?.publicKey || stripePublicKey).trim();
      if (!intentPublicKey) {
        throw new Error('Chave pública do Stripe não configurada no servidor.');
      }
      await this.ensureStripeCardElement(intentPublicKey);

      if (this.stripeCardError) {
        throw new Error(this.normalizeStripeErrorMessage(this.stripeCardError));
      }
      if (!this.stripeCardComplete) {
        throw new Error('Preencha corretamente os dados do cartão antes de confirmar.');
      }

      const result = await this.stripe.confirmCardPayment(stripeIntent.clientSecret, {
        payment_method: {
          card: this.stripeCardElement,
          billing_details: {
            name: this.dadosCartao.nome || 'Cliente Easy Parking'
          }
        }
      });

      if (result.error) {
        throw new Error(this.normalizeStripeErrorMessage(result.error));
      }

      if (result.paymentIntent?.status !== 'succeeded') {
        throw new Error('O pagamento ainda não foi confirmado pelo Stripe. Tente novamente em instantes.');
      }

      this.carteiraService.adicionarValor(this.valorOperacao, this.descricaoOperacao, 'cartao');
      this.carteira = this.carteiraService.obterCarteira();
      this.valorOperacao = 0;
      this.valorOperacaoDisplay = '';
      this.descricaoOperacao = '';
      this.fecharModal();
    } catch (error: any) {
      alert(this.normalizeStripeErrorMessage(error));
      console.error('Erro ao pagar com Stripe na carteira:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Função para simular o processamento do pagamento PIX
  simularPagamento() {
    this.isLoading = true;
    setTimeout(() => {
      // Aqui você pode verificar com o backend se o pagamento foi confirmado, se necessário
      // Simulação de confirmação de pagamento (por exemplo, checando um status no backend)

      // Adicionar o valor à carteira
      this.carteiraService.adicionarValor(this.valorOperacao, this.descricaoOperacao, 'pix');
      this.carteira = this.carteiraService.obterCarteira();
      this.valorOperacao = 0;
      this.valorOperacaoDisplay = '';
      this.descricaoOperacao = '';

      // Após o pagamento ser confirmado, desative o estado de carregamento
      this.isLoading = false;

      // Fechar o modal após o pagamento ser realizado
      this.fecharModal();
    }, 5000); // Simula 5 segundos de espera pelo pagamento
  }

  copiarCodigoPix() {
    navigator.clipboard.writeText(this.codigoPix).then(() => {
      alert('Código PIX copiado com sucesso!');
    }).catch(err => {
      console.error('Erro ao copiar o código PIX:', err);
    });
  }

  resetarDadosPagamento() {
    this.dadosCartao = { nome: '' };
    this.qrCodeSrc = '';
    this.unmountStripeCardElement();
  }

  onValorOperacaoInput(valorDigitado: string): void {
    const somenteDigitos = (valorDigitado || '').replace(/\D/g, '');
    if (!somenteDigitos) {
      this.valorOperacaoDisplay = '';
      this.valorOperacao = 0;
      return;
    }

    const valorEmCentavos = Number(somenteDigitos);
    this.valorOperacao = valorEmCentavos / 100;
    this.valorOperacaoDisplay = this.formatarValorBRL(this.valorOperacao);
  }

  private formatarValorBRL(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  private async ensureStripeCardElement(preferredStripeKey?: string): Promise<void> {
    const stripeKey = String(preferredStripeKey || await this.ensureStripePublicKeyLoaded()).trim();
    if (!stripeKey) {
      throw new Error('Chave pública do Stripe não configurada.');
    }

    if (!(window as any).Stripe) {
      await this.loadStripeScript();
    }

    const stripeKeyChanged = this.stripeInitializedPublicKey !== stripeKey;
    if (!this.stripe || stripeKeyChanged) {
      this.unmountStripeCardElement();
      this.stripe = (window as any).Stripe(stripeKey);
      this.stripeInitializedPublicKey = stripeKey;
    }

    const elementHost = document.getElementById('wallet-card-element');
    if (!elementHost) {
      throw new Error('Campo do cartão não foi encontrado na tela.');
    }

    if (this.stripeCardElement && this.stripeCardHost === elementHost) {
      return;
    }

    this.unmountStripeCardElement();
    const elements = this.stripe.elements();
    this.stripeCardElement = elements.create('card', {
      style: {
        base: {
          color: '#0f172a',
          fontFamily: 'Roboto, Arial, sans-serif',
          fontSmoothing: 'antialiased',
          fontSize: '16px',
          '::placeholder': {
            color: '#94a3b8'
          }
        },
        invalid: {
          color: '#ef4444',
          iconColor: '#ef4444'
        }
      }
    });

    this.stripeCardComplete = false;
    this.stripeCardError = '';
    this.stripeCardElement.on('change', (event: any) => {
      this.stripeCardComplete = !!event?.complete;
      this.stripeCardError = event?.error?.message || '';
    });
    this.stripeCardElement.mount(elementHost);
    this.stripeCardHost = elementHost;
  }

  private async initializeStripeCardElement(): Promise<void> {
    const stripeKey = await this.ensureStripePublicKeyLoaded();
    if (!stripeKey) {
      return;
    }
    await this.ensureStripeCardElement();
  }

  private loadStripeScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).Stripe) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Não foi possível carregar o script do Stripe.'));
      document.body.appendChild(script);
    });
  }

  private getStripePublicKey(): string {
    const runtimeStripeKey = (window as any)?.__env?.STRIPE_PUBLIC_KEY || (window as any)?.__env?.stripePublicKey || '';
    return String(runtimeStripeKey || this.backendStripePublicKey).trim();
  }

  private async ensureStripePublicKeyLoaded(): Promise<string> {
    if (!this.stripePublicKeyLookupAttempted) {
      this.stripePublicKeyLookupAttempted = true;
      try {
        const response = await this.pagBankService.getStripePublicKey().toPromise();
        const publicKey = String(response?.publicKey || '').trim();
        if (publicKey) {
          this.backendStripePublicKey = publicKey;
          return publicKey;
        }
      } catch (error) {
        console.error('Não foi possível carregar STRIPE_PUBLIC_KEY do backend:', error);
      }
    }

    return this.getStripePublicKey();
  }

  private normalizeStripeErrorMessage(stripeError: any): string {
    const fallback = 'Não foi possível processar o cartão no Stripe.';
    const rawMessage = (typeof stripeError === 'string'
      ? stripeError
      : stripeError?.error?.message || stripeError?.message || '').trim();
    const normalized = rawMessage.toLowerCase();

    if (!normalized) {
      return fallback;
    }
    if (normalized.includes('your card was declined')) {
      return 'Cartão recusado pelo Stripe. Use um cartão de teste válido ou tente outro cartão.';
    }
    if (normalized.includes('insufficient funds')) {
      return 'Pagamento recusado por saldo insuficiente no cartão.';
    }
    if (normalized.includes('incorrect cvc')) {
      return 'Código de segurança (CVV) inválido.';
    }
    if (normalized.includes('expired card')) {
      return 'Cartão expirado. Verifique a validade e tente novamente.';
    }
    if (normalized.includes('incorrect number')) {
      return 'Número do cartão inválido.';
    }
    if (normalized.includes('invalid expiry') || normalized.includes('expiry')) {
      return 'Data de validade inválida.';
    }
    if (normalized.includes('authentication required')) {
      return 'O banco solicitou autenticação adicional para este cartão.';
    }
    if (normalized.includes('processing error')) {
      return 'Erro temporário do emissor do cartão. Tente novamente em instantes.';
    }
    if (normalized.includes('não foi possível carregar o script do stripe')) {
      return rawMessage;
    }

    return rawMessage || fallback;
  }

  private unmountStripeCardElement(): void {
    if (this.stripeCardElement) {
      this.stripeCardElement.unmount();
      this.stripeCardElement = null;
      this.stripeCardHost = null;
      this.stripeCardComplete = false;
      this.stripeCardError = '';
    }
  }

  ngOnDestroy(): void {
    this.unmountStripeCardElement();
  }
}
