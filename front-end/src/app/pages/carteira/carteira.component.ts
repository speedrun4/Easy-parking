import { Component, OnDestroy, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Carteira } from 'src/app/models/carteira.model';
import { AsaasService } from 'src/app/services/asaas.service';
import { AuthService } from 'src/app/services/auth.service';
import { CarteiraService } from 'src/app/services/carteira.service';
import { PaymentHistoryService } from 'src/app/services/payment-history.service';

@Component({
  selector: 'app-carteira',
  templateUrl: './carteira.component.html',
  styleUrls: ['./carteira.component.scss']
})
export class CarteiraComponent implements OnInit, OnDestroy {
  readonly isSandboxMode = !environment.production;
  carteira: Carteira = { saldo: 0, historicoTransacoes: [] };
  valorOperacao = 0;
  valorOperacaoDisplay = '';
  descricaoOperacao = '';
  mostrarModal = false;
  metodoSelecionado: 'pix' | 'cartao' | null = null;
  isLoading = false;
  qrCodeSrc = '';
  codigoPix = '';
  pixStatus = '';
  currentPixPaymentId: number | null = null;
  private pixStatusPollingId: ReturnType<typeof setInterval> | null = null;
  private walletCreditApplied = false;

  dadosCartao = {
    nome: '',
    numero: '',
    validade: '',
    cvv: ''
  };

  constructor(
    private carteiraService: CarteiraService,
    private asaasService: AsaasService,
    private authService: AuthService,
    private paymentHistoryService: PaymentHistoryService
  ) {}

  ngOnInit(): void {
    this.carteira = this.carteiraService.obterCarteira();
  }

  abrirModal() {
    if (this.valorOperacao <= 0) {
      alert('Informe um valor maior que zero para adicionar na carteira.');
      return;
    }

    this.mostrarModal = true;
    this.resetGatewayState();
  }

  fecharModal() {
    this.mostrarModal = false;
    this.metodoSelecionado = null;
    this.resetarDadosPagamento();
    this.stopPixStatusPolling();
  }

  selecionarMetodo(metodo: 'pix' | 'cartao') {
    this.metodoSelecionado = metodo;
    this.resetGatewayState();
  }

  confirmarPagamento() {
    if (!this.metodoSelecionado) {
      alert('Selecione um método de pagamento.');
      return;
    }

    if (this.metodoSelecionado === 'cartao') {
      this.processarPagamentoCartao();
      return;
    }

    if (this.currentPixPaymentId) {
      this.atualizarStatusPix();
      return;
    }

    this.iniciarPagamentoPix();
  }

  private processarPagamentoCartao() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      alert('Faça login para adicionar saldo com cartão.');
      return;
    }

    const cardPayload = this.buildCardPurchasePayload(currentUser);
    if (!cardPayload) {
      alert('Preencha corretamente nome, número, validade e CVV do cartão.');
      return;
    }

    this.isLoading = true;
    this.asaasService.createPurchase(cardPayload).subscribe({
      next: (purchaseResp: any) => {
        const charge = purchaseResp?.charge || {};
        const chargeStatus = String(charge?.status || '').toUpperCase();
        const approvedStatuses = ['PAID', 'AUTHORIZED', 'RECEIVED', 'CONFIRMED'];

        if (!approvedStatuses.includes(chargeStatus)) {
          this.isLoading = false;
          alert(this.getCardDeclineReason(charge));
          return;
        }

        this.aplicarRecargaConcluida('cartao');
      },
      error: (error) => {
        this.isLoading = false;
        alert(this.extractCardGatewayError(error));
      }
    });
  }

  private iniciarPagamentoPix() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      alert('Faça login para adicionar saldo via PIX.');
      return;
    }

    if (this.valorOperacao < 5) {
      alert('O Asaas exige valor minimo de R$ 5,00 para cobranca PIX.');
      return;
    }

    this.isLoading = true;
    this.asaasService.createPurchase({
      method: 'PIX',
      amount: Number(this.valorOperacao.toFixed(2)),
      description: this.descricaoOperacao || 'Recarga da carteira Easy Parking',
      referenceId: this.buildWalletReference('PIX'),
      usuarioId: currentUser.id,
      productName: 'Recarga carteira'
    }).subscribe({
      next: (purchaseResp: any) => {
        const charge = purchaseResp?.charge || {};
        const pixTransaction = charge?.pixTransaction || {};
        this.currentPixPaymentId = Number(purchaseResp?.paymentId || 0) || null;
        this.pixStatus = charge?.status || purchaseResp?.paymentStatus || 'PENDING';
        this.codigoPix = pixTransaction?.payload || pixTransaction?.qrCode || '';
        const encodedImage = String(pixTransaction?.encodedImage || '').trim();
        this.qrCodeSrc = encodedImage ? `data:image/png;base64,${encodedImage}` : '';
        this.isLoading = false;

        if (!this.currentPixPaymentId || !this.codigoPix) {
          alert('Nao foi possivel gerar o PIX da carteira.');
          return;
        }

        this.startPixStatusPolling();
      },
      error: (error) => {
        this.isLoading = false;
        alert(this.extractBackendErrorMessage(error, 'Nao foi possivel iniciar o PIX da carteira.'));
      }
    });
  }

  atualizarStatusPix() {
    if (!this.currentPixPaymentId) {
      return;
    }

    this.isLoading = true;
    this.paymentHistoryService.consultarStatusPix(this.currentPixPaymentId).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.pixStatus = response.status || this.pixStatus || 'PENDING';
        if (response.qrBase64) {
          this.qrCodeSrc = `data:image/png;base64,${response.qrBase64}`;
        }
        if (response.qrPayload) {
          this.codigoPix = response.qrPayload;
        }

        if (this.isPixPaymentCompleted(response.status, response.paymentStatus)) {
          this.aplicarRecargaConcluida('pix');
        }
      },
      error: (error) => {
        this.isLoading = false;
        alert(this.extractBackendErrorMessage(error, 'Nao foi possivel consultar o status do PIX.'));
      }
    });
  }

  simularPixPago() {
    if (!this.isSandboxMode || !this.currentPixPaymentId) {
      return;
    }

    this.isLoading = true;
    this.paymentHistoryService.simularPixPago(this.currentPixPaymentId).subscribe({
      next: () => {
        this.isLoading = false;
        this.atualizarStatusPix();
      },
      error: (error) => {
        this.isLoading = false;
        alert(this.extractBackendErrorMessage(error, 'Nao foi possivel simular o pagamento PIX.'));
      }
    });
  }

  copiarCodigoPix() {
    navigator.clipboard.writeText(this.codigoPix).then(() => {
      alert('Codigo PIX copiado com sucesso!');
    }).catch(err => {
      console.error('Erro ao copiar o codigo PIX:', err);
    });
  }

  resetarDadosPagamento() {
    this.dadosCartao = {
      nome: '',
      numero: '',
      validade: '',
      cvv: ''
    };
    this.resetGatewayState();
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

  onCardNumberInput(valorDigitado: string): void {
    const digits = (valorDigitado || '').replace(/\D/g, '').slice(0, 19);
    this.dadosCartao.numero = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  onCardExpiryInput(valorDigitado: string): void {
    const digits = (valorDigitado || '').replace(/\D/g, '').slice(0, 6);
    if (digits.length <= 2) {
      this.dadosCartao.validade = digits;
      return;
    }
    this.dadosCartao.validade = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  onCardCvvInput(valorDigitado: string): void {
    this.dadosCartao.cvv = (valorDigitado || '').replace(/\D/g, '').slice(0, 4);
  }

  getConfirmButtonText(): string {
    if (this.metodoSelecionado === 'cartao') {
      return 'Pagar com cartao';
    }
    if (this.currentPixPaymentId) {
      return 'Atualizar status do PIX';
    }
    return 'Gerar PIX';
  }

  ngOnDestroy(): void {
    this.stopPixStatusPolling();
  }

  private aplicarRecargaConcluida(metodo: 'pix' | 'cartao') {
    if (this.walletCreditApplied) {
      return;
    }

    this.walletCreditApplied = true;
    this.stopPixStatusPolling();
    this.carteiraService.adicionarValor(this.valorOperacao, this.descricaoOperacao, metodo);
    this.carteira = this.carteiraService.obterCarteira();
    this.valorOperacao = 0;
    this.valorOperacaoDisplay = '';
    this.descricaoOperacao = '';
    this.isLoading = false;
    this.fecharModal();
  }

  private buildCardPurchasePayload(currentUser: any): any | null {
    const number = (this.dadosCartao.numero || '').replace(/\D/g, '');
    const cvv = (this.dadosCartao.cvv || '').replace(/\D/g, '');
    const expiryDigits = (this.dadosCartao.validade || '').replace(/\D/g, '');
    if (expiryDigits.length !== 6) {
      return null;
    }

    const holderName = (this.dadosCartao.nome || currentUser?.nomeCompleto || 'CLIENTE').trim();
    if (!holderName || number.length < 13 || number.length > 19 || cvv.length < 3) {
      return null;
    }

    return {
      method: 'CREDIT_CARD',
      amount: Number(this.valorOperacao.toFixed(2)),
      description: this.descricaoOperacao || 'Recarga da carteira Easy Parking',
      referenceId: this.buildWalletReference('CARD'),
      usuarioId: currentUser?.id,
      productName: 'Recarga carteira',
      card: {
        number,
        exp_month: expiryDigits.slice(0, 2),
        exp_year: expiryDigits.slice(2, 6),
        security_code: cvv,
        holder: {
          name: holderName,
          tax_id: (currentUser?.cpf || '').replace(/\D/g, '') || undefined,
          email: currentUser?.email || undefined,
          phone: (currentUser?.telefone || '').replace(/\D/g, '') || undefined
        }
      }
    };
  }

  private buildWalletReference(prefix: 'PIX' | 'CARD'): string {
    return `WALLET-${prefix}-${Date.now()}`;
  }

  private startPixStatusPolling(): void {
    this.stopPixStatusPolling();
    this.pixStatusPollingId = setInterval(() => {
      if (!this.currentPixPaymentId || this.walletCreditApplied) {
        this.stopPixStatusPolling();
        return;
      }
      this.atualizarStatusPix();
    }, 5000);
  }

  private stopPixStatusPolling(): void {
    if (this.pixStatusPollingId) {
      clearInterval(this.pixStatusPollingId);
      this.pixStatusPollingId = null;
    }
  }

  private resetGatewayState(): void {
    this.stopPixStatusPolling();
    this.qrCodeSrc = '';
    this.codigoPix = '';
    this.pixStatus = '';
    this.currentPixPaymentId = null;
    this.walletCreditApplied = false;
    this.isLoading = false;
  }

  private isPixPaymentCompleted(gatewayStatus?: string, localPaymentStatus?: string): boolean {
    const normalizedGatewayStatus = (gatewayStatus || '').trim().toUpperCase();
    const normalizedLocalStatus = (localPaymentStatus || '').trim().toUpperCase();
    const paidGatewayStatuses = ['APPROVED', 'PAID', 'CONFIRMED', 'COMPLETED', 'RECEIVED'];
    const paidLocalStatuses = ['PAGO', 'PAID'];
    return paidGatewayStatuses.includes(normalizedGatewayStatus) || paidLocalStatuses.includes(normalizedLocalStatus);
  }

  private getCardDeclineReason(charge: any): string {
    const paymentResponse = charge?.payment_response || {};
    const code = paymentResponse?.code;
    const description = paymentResponse?.message || paymentResponse?.description;
    const status = charge?.status ? `Status: ${charge.status}.` : '';

    if (code || description) {
      return `${status} Cartao nao autorizado pelo Asaas.${code ? ` Codigo: ${code}.` : ''}${description ? ` Motivo: ${description}.` : ''}`.trim();
    }

    return `${status} Cartao nao autorizado pelo Asaas.`.trim();
  }

  private extractCardGatewayError(error: any): string {
    const fallback = 'Nao foi possivel autorizar o cartao no Asaas.';
    const raw = this.extractBackendErrorMessage(error, fallback);

    if (!raw) {
      return fallback;
    }

    if (raw.toLowerCase().includes('invalid_parameter')) {
      return 'Falha de configuracao da integracao de cartao no Asaas. Verifique os dados obrigatorios e tente novamente.';
    }

    return raw;
  }

  private extractBackendErrorMessage(err: any, fallback: string): string {
    const backendError = err?.error;

    if (typeof backendError === 'string' && backendError.trim().length > 0) {
      return backendError;
    }

    if (backendError?.message && typeof backendError.message === 'string') {
      return backendError.message;
    }

    if (err?.message && typeof err.message === 'string') {
      return err.message;
    }

    return fallback;
  }

  private formatarValorBRL(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
