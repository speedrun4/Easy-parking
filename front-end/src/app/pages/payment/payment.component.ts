import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval, of, Subscription } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import * as QRCode from 'qrcode';
import { PreReservationService } from 'src/app/services/pre-reservation.service';
import { MatDialog } from '@angular/material/dialog';
import { AlertDialogCancelComponent } from 'src/app/components/alert-dialog-cancel/alert-dialog-cancel.component';
import { SucessoModalComponent } from 'src/app/components/sucess-modal/sucess-modal.component';
import { ErrorDialogComponent } from 'src/app/components/error-dialog/error-dialog.component';
import { PixProgressModalComponent } from 'src/app/components/pix-progress-modal/pix-progress-modal.component';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';
import { PaymentHistoryService } from 'src/app/services/payment-history.service';
import { AuthService } from 'src/app/services/auth.service';
import { ReservaService } from 'src/app/services/reserva.service';
import { CarteiraService } from 'src/app/services/carteira.service';
import { PagBankService } from 'src/app/services/pagbank.service';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements OnInit, OnDestroy {
  private readonly firstReservationPromoCode = 'first-reservation-10';
  private readonly firstReservationDiscountRate = 0.10;

  totalValue: number = 0;
  originalTotalValue: number = 0;
  discountTotalValue: number = 0;
  promoValidationMessage: string = '';
  isValidatingPromotion: boolean = false;
  selectedPaymentMethod: string = '';
  paymentMethods = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Carteira'];
  qrCodeData: string = '';
  qrCodeImage: string = '';
  pixQrBase64: string = '';
  pixQrPayload: string = '';
  pixDisplayKey: string = environment.pixKey;
  pixStatus: string = '';
  pixChargeId: string = '';
  isProcessingPayment: boolean = false;
  cardBrand: string = '';
  loading: boolean = false;
  isRedirectingToRoute: boolean = false;
  private pollingSub?: Subscription;
  private pollingCount = 0;
  private maxPollingCount = 300; // ~15 min com intervalo 3s
  private pixCompletionTriggered = false;
  private readonly pixKey = environment.pixKey;
  errorMsg: string = '';
  currentPaymentId: number | null = null; // armazena id do pagamento para ações manuais

  cardNumber: string = '';
  cardName: string = '';
  cardExpiry: string = '';
  cardCVV: string = '';

  payerName: string = '';
  payerDocument: string = '';

  showCreditCardForm: boolean = false;
  showDebitCardForm: boolean = false;
  selectedParkings: any[] = [];
  selectedDate: Date | null = null;
  selectedTime: string | null = null;
  paymentData: any = null;
  activePromoCode: string | null = null;
  private baseOriginalTotalValue: number = 0;
  private baseDiscountTotalValue: number = 0;

  constructor(
    private router: Router,
    private preReservaService: PreReservationService,
    private dialog: MatDialog,
    private paymentHistoryService: PaymentHistoryService,
    private authService: AuthService,
    private reservaService: ReservaService,
    private carteiraService: CarteiraService,
    private pagBankService: PagBankService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as {
      totalValue: number;
      selectedDate: Date | null;
      selectedTime: string | null;
      selectedParkings: any[];
      activePromoCode?: string | null;
    };

    if (state) {
      this.totalValue = state.totalValue;
      this.selectedDate = state.selectedDate;
      this.selectedTime = state.selectedTime;
      this.selectedParkings = state.selectedParkings || [];
      this.activePromoCode = state.activePromoCode || null;
      this.updatePaymentTotals();
    }
  }

  ngOnInit(): void {
    try {
      const storedData = localStorage.getItem('paymentData') || localStorage.getItem('preReservaData');
      if (storedData) {
        this.paymentData = JSON.parse(storedData);
        if (Array.isArray(this.paymentData?.selectedParkings) && this.paymentData.selectedParkings.length > 0) {
          this.selectedParkings = this.selectedParkings.length > 0 ? this.selectedParkings : this.paymentData.selectedParkings;
        }
        if (!this.activePromoCode && this.paymentData.activePromoCode) {
          this.activePromoCode = this.paymentData.activePromoCode;
        }
        if (this.paymentData.totalValue) {
          this.totalValue = Number(this.paymentData.totalValue);
        }
      }

      this.updatePaymentTotals();
      this.evaluateFirstReservationPromotion();

      if (!this.selectedParkings || this.selectedParkings.length === 0) {
        console.warn('Nenhum estacionamento selecionado encontrado.');
        this.router.navigate(['/']);
      }
    } catch (error) {
      console.error('Erro ao carregar os dados de pagamento:', error);
      this.router.navigate(['/']);
    }
  }

  private updatePaymentTotals(): void {
    const hasBaseTotals = (this.selectedParkings || []).some((p: any) => p?.baseTotal !== undefined);

    if (hasBaseTotals) {
      this.baseOriginalTotalValue = this.roundToCents(
        this.selectedParkings.reduce((acc: number, p: any) => acc + Number(p?.baseTotal || 0), 0)
      );
      this.baseDiscountTotalValue = this.roundToCents(
        this.selectedParkings.reduce((acc: number, p: any) => acc + Number(p?.discountAmount || 0), 0)
      );
      this.applyPaymentTotals(0);
      return;
    }

    const totals = (this.selectedParkings || []).map((p: any) => Number(p?.total || 0)).filter((v: number) => v > 0);
    if (totals.length > 0) {
      this.totalValue = this.roundToCents(totals.reduce((acc: number, v: number) => acc + v, 0));
    }

    this.baseOriginalTotalValue = this.totalValue;
    this.baseDiscountTotalValue = 0;
    this.applyPaymentTotals(0);
  }

  private applyPaymentTotals(extraDiscount: number): void {
    const normalizedExtraDiscount = this.roundToCents(extraDiscount);
    this.originalTotalValue = this.baseOriginalTotalValue;
    this.discountTotalValue = this.roundToCents(this.baseDiscountTotalValue + normalizedExtraDiscount);
    const subtotalAfterBaseDiscounts = this.roundToCents(this.baseOriginalTotalValue - this.baseDiscountTotalValue);
    this.totalValue = this.roundToCents(subtotalAfterBaseDiscounts - normalizedExtraDiscount);
  }

  private evaluateFirstReservationPromotion(): void {
    this.promoValidationMessage = '';

    if (this.activePromoCode !== this.firstReservationPromoCode) {
      this.applyPaymentTotals(0);
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.promoValidationMessage = 'Faça login para validar a promocao da primeira reserva.';
      this.applyPaymentTotals(0);
      return;
    }

    this.isValidatingPromotion = true;
    this.promoValidationMessage = 'Validando promocao de primeira reserva...';

    this.paymentHistoryService.getPaidReservations(currentUser.id).subscribe({
      next: (reservas) => {
        const subtotalAfterBaseDiscounts = this.roundToCents(this.baseOriginalTotalValue - this.baseDiscountTotalValue);
        const isNewUser = !Array.isArray(reservas) || reservas.length === 0;

        if (isNewUser && subtotalAfterBaseDiscounts > 0) {
          const firstReservationDiscount = this.roundToCents(subtotalAfterBaseDiscounts * this.firstReservationDiscountRate);
          this.applyPaymentTotals(firstReservationDiscount);
          this.promoValidationMessage = 'Promocao aplicada: 10% OFF na sua primeira reserva.';
        } else {
          this.applyPaymentTotals(0);
          this.promoValidationMessage = 'Promocao nao aplicada: valida somente para usuarios sem reservas pagas anteriores.';
        }

        this.isValidatingPromotion = false;
      },
      error: () => {
        this.applyPaymentTotals(0);
        this.promoValidationMessage = 'Nao foi possivel validar a promocao da primeira reserva.';
        this.isValidatingPromotion = false;
      }
    });
  }

  private roundToCents(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  isPaymentMethodValid() {
    return this.selectedPaymentMethod === 'Cartão de Crédito' ||
      this.selectedPaymentMethod === 'Cartão de Débito';
  }

  onPaymentMethodChange() {
    this.showCreditCardForm = this.selectedPaymentMethod === 'Cartão de Crédito';
    this.showDebitCardForm = this.selectedPaymentMethod === 'Cartão de Débito';

    if (this.selectedPaymentMethod === 'Pix') {
      // Para PIX, inicia automaticamente o fluxo de cobrança e exibição do QR.
      this.startPixFlow();
    } else {
      if (this.pollingSub) {
        this.pollingSub.unsubscribe();
      }
      this.qrCodeImage = '';
      this.isProcessingPayment = false;
      this.loading = false;
    }
  }

  private startPixFlow() {
    if (this.isProcessingPayment) {
      return;
    }
    if (this.currentPaymentId && (this.pixQrBase64 || this.pixQrPayload)) {
      return;
    }
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }

    this.errorMsg = '';
    this.loading = true;
    this.isProcessingPayment = true;
    this.pixCompletionTriggered = false;
    this.qrCodeData = '';
    this.qrCodeImage = '';
    this.pixQrBase64 = '';
    this.pixQrPayload = '';
    this.pixStatus = 'INICIANDO';

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.loading = false;
      this.isProcessingPayment = false;
      this.errorMsg = 'Usuário não autenticado. Faça login para realizar o pagamento.';
      return;
    }

    this.selectedParkings = (this.selectedParkings || []).map(p => ({
      ...p,
      horaSaida: p.horaSaida || p.selectedExitTime || p.selectedHoraSaida || null
    }));
    const selected = this.selectedParkings[0];
    if (!selected) {
      this.loading = false;
      this.isProcessingPayment = false;
      this.errorMsg = 'Nenhum estacionamento selecionado para pagamento.';
      return;
    }

    const formatDateISO = (dateStr: string) => {
      if (!dateStr) return null;
      if (dateStr.includes('-')) return dateStr;
      const [dia, mes, ano] = dateStr.split('/');
      return `${ano}-${mes}-${dia}`;
    };
    const padTime = (t: string) => t && t.length === 5 ? t + ':00' : t;

    const parkingName = selected.title || selected.companyName || selected.nome || selected.name || 'Estacionamento reservado';
    const parkingAddress = selected.address || selected.endereco || selected.street || '';

    const pagamento: any = {
      nome: this.cardName || this.payerName || 'Usuário Pix',
      formaPagamento: 'PIX',
      valorPago: this.totalValue,
      estacionamento: parkingName,
      latitude: selected.latitude ?? selected.lat,
      longitude: selected.longitude ?? selected.lon,
      endereco: parkingAddress,
      usuario: { id: currentUser.id },
      dataReservaEntrada: formatDateISO(selected.selectedDate || selected.data || null),
      horarioReservaEntrada: selected.selectedTime || selected.horaEntrada || selected.horarioEntrada || null,
      horarioReservaSaida: padTime(selected.horaSaida || null)
    };

    this.paymentHistoryService.salvarPagamento(pagamento).subscribe({
      next: (res) => {
        const savedPaymentId = (res as any)?.id;
        this.currentPaymentId = savedPaymentId || null;
        if (!savedPaymentId) {
          this.loading = false;
          this.isProcessingPayment = false;
          this.errorMsg = 'Falha ao iniciar PIX. Tente novamente.';
          return;
        }

        this.paymentHistoryService.iniciarPix(savedPaymentId, { pixKey: this.pixKey }).subscribe({
          next: r => {
            this.pixChargeId = r.pagbankChargeId || '';
            const normalizedStatus = (r.status || '').toUpperCase();
            const hasQrData = !!(r.qrBase64 || r.qrPayload);
            const isUntrackable = normalizedStatus === 'UNTRACKABLE';
            if (!this.pixChargeId && (isUntrackable || !hasQrData)) {
              this.loading = false;
              this.isProcessingPayment = false;
              this.errorMsg = 'Falha na integração PIX: cobrança não rastreável no PagBank. Gere um novo pagamento após validar configuração do servidor.';
              return;
            }
            this.pixStatus = r.status || 'WAITING';
            this.pixDisplayKey = r.pixKey || this.pixKey;
            if (r.qrBase64) {
              this.pixQrBase64 = `data:image/png;base64,${r.qrBase64}`;
            }
            if (r.qrPayload) {
              this.pixQrPayload = r.qrPayload;
            }

            this.loading = false;
            this.isProcessingPayment = false;

            this.pollingCount = 0;
            this.pollingSub = interval(3000).pipe(
              switchMap(() => this.paymentHistoryService.consultarStatusPix(savedPaymentId)),
              catchError(() => {
                this.errorMsg = 'Falha temporária ao consultar PIX. Tentando novamente...';
                return of({ status: this.pixStatus || 'WAITING' } as { status: string; paymentStatus?: string });
              })
            ).subscribe((statusResp: { status: string; paymentStatus?: string }) => {
              this.pixStatus = statusResp.status;
              this.pollingCount++;
              if (this.isPixPaymentCompleted(statusResp.status, statusResp.paymentStatus)) {
                this.handlePixPaidSuccess();
              } else if (this.pollingCount >= this.maxPollingCount) {
                if (this.pollingSub) { this.pollingSub.unsubscribe(); }
                this.isProcessingPayment = false;
                this.loading = false;
                this.errorMsg = 'Tempo esgotado para confirmação do PIX. Você pode tentar novamente.';
              }
            });
          },
          error: err => {
            this.loading = false;
            this.isProcessingPayment = false;
            this.errorMsg = this.extractBackendErrorMessage(err, 'Não foi possível iniciar o PIX. Tente novamente.');
            console.error('Falha ao iniciar PIX:', err);
          }
        });
      },
      error: (error) => {
        this.loading = false;
        this.isProcessingPayment = false;
        this.errorMsg = 'Erro ao preparar o pagamento PIX.';
        console.error('Erro ao salvar pagamento PIX:', error);
      }
    });
  }

  confirmPayment() {
    if (this.selectedPaymentMethod === 'Pix') {
      return;
    }

    if (!this.selectedPaymentMethod) {
      this.dialog.open(SucessoModalComponent, {
        data: {
          title: 'Atenção',
          message: 'Selecione um método de pagamento.'
        }
      });
      return;
    }

    if (this.selectedPaymentMethod === 'Cartão de Crédito' || this.selectedPaymentMethod === 'Cartão de Débito') {
      const cardErrors = this.validateCard();
      if (cardErrors.length) {
        this.dialog.open(ErrorDialogComponent, {
          data: { title: 'Erro de Cartão', message: cardErrors.join('\n') }
        });
        return;
      }
    }

    this.preReservaService.notifyPreReservaCancelled();
    console.log('selectedParkings no pagamento:', this.selectedParkings);
    this.selectedParkings = this.selectedParkings.map(p => ({
      ...p,
      horaSaida: p.horaSaida || p.selectedExitTime || p.selectedHoraSaida || null
    }));
    const selected = this.selectedParkings[0];
    if (!selected) {
      this.dialog.open(ErrorDialogComponent, {
        data: { title: 'Erro no pagamento', message: 'Nenhum estacionamento selecionado para pagamento.' }
      });
      return;
    }

    console.log('Valor de horário de saída enviado:', selected.horaSaida);
    const parkingName = selected.title || selected.companyName || selected.nome || selected.name || 'Estacionamento reservado';
    const parkingAddress = selected.address || selected.endereco || selected.street || '';
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      this.dialog.open(SucessoModalComponent, {
        data: {
          title: 'Atenção',
          message: 'Usuário não autenticado. Faça login para realizar o pagamento.'
        }
      });
      return;
    }
    const formatDateISO = (dateStr: string) => {
      if (!dateStr) return null;
      if (dateStr.includes('-')) return dateStr; // já está no formato ISO
      const [dia, mes, ano] = dateStr.split('/');
      return `${ano}-${mes}-${dia}`;
    };

    const padTime = (t: string) => t && t.length === 5 ? t + ':00' : t;

    const forma = this.selectedPaymentMethod === 'Carteira' ? 'Carteira' : this.selectedPaymentMethod;

    if (forma === 'Carteira') {
      const saldoAtual = this.carteiraService.obterCarteira().saldo;
      if (!this.carteiraService.temSaldoSuficiente(this.totalValue)) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
          data: {
            title: 'Saldo insuficiente',
            message: `Você não tem saldo suficiente na carteira (saldo atual: R$ ${saldoAtual.toFixed(2)}). Deseja adicionar saldo agora?`,
            confirmText: 'Sim',
            cancelText: 'Não'
          }
        });

        dialogRef.afterClosed().subscribe((goToWallet: boolean) => {
          if (goToWallet) {
            this.router.navigate(['/carteira']);
          }
        });
        return;
      }

      const descricaoDebito = `Pagamento de reserva - ${parkingName}`;
      const debitoRealizado = this.carteiraService.removerValorSePossivel(this.totalValue, descricaoDebito);
      if (!debitoRealizado) {
        this.dialog.open(ErrorDialogComponent, {
          data: {
            title: 'Saldo insuficiente',
            message: 'Não foi possível debitar o valor da carteira. Tente novamente.'
          }
        });
        return;
      }
    }

    const pagamento: any = {
      nome: this.cardName || this.payerName || 'Usuário Pix',
      formaPagamento: forma,
      valorPago: this.totalValue,
      estacionamento: parkingName,
      latitude: selected.latitude ?? selected.lat,
      longitude: selected.longitude ?? selected.lon,
      endereco: parkingAddress,
      usuario: { id: currentUser.id },
      // status será definido no backend (para PIX começa como aguardando_pagamento)
  dataReservaEntrada: formatDateISO(selected.selectedDate || selected.data || null),
  horarioReservaEntrada: selected.selectedTime || selected.horaEntrada || selected.horarioEntrada || null,
  horarioReservaSaida: padTime(selected.horaSaida || null)
    };

    const isCardMethod = forma === 'Cartão de Crédito' || forma === 'Cartão de Débito';
    if (isCardMethod) {
      const purchasePayload = this.buildCardPurchasePayload(parkingName, currentUser, forma);
      if (!purchasePayload) {
        if (forma === 'Carteira') {
          this.carteiraService.adicionarValor(this.totalValue, `Estorno - Pagamento de reserva - ${parkingName}`, 'ajuste');
        }
        this.dialog.open(ErrorDialogComponent, {
          data: {
            title: 'Erro no pagamento',
            message: 'Dados do cartao invalidos para processar no PagBank. Verifique nome e CPF do titular.'
          }
        });
        return;
      }

      this.loading = true;
      this.pagBankService.createPurchase(purchasePayload).subscribe({
        next: (purchaseResp: any) => {
          const charge = purchaseResp?.charge || {};
          const chargeStatus = String(charge?.status || '').toUpperCase();
          const approvedStatuses = ['PAID', 'AUTHORIZED'];
          const isApproved = approvedStatuses.includes(chargeStatus);

          if (!isApproved) {
            this.loading = false;
            const declineReason = this.getCardDeclineReason(charge);
            this.dialog.open(ErrorDialogComponent, {
              data: {
                title: 'Cartao nao autorizado',
                message: declineReason
              }
            });
            return;
          }

          pagamento.pagbankChargeId = charge?.id || null;
          pagamento.pagbankStatus = charge?.status || null;
          pagamento.pagbankOrderId = charge?.reference_id || purchasePayload.referenceId || null;

          // Mantém referência caso o endpoint retorne id/status locais.
          if (purchaseResp?.paymentId) {
            this.currentPaymentId = Number(purchaseResp.paymentId);
          }
          this.persistLocalPayment(pagamento, forma, parkingName, selected, currentUser);
        },
        error: (error) => {
          this.loading = false;
          const msg = this.extractCardGatewayError(error);
          this.dialog.open(ErrorDialogComponent, {
            data: {
              title: 'Cartao recusado',
              message: msg
            }
          });
        }
      });
      return;
    }

    this.loading = true;
    this.persistLocalPayment(pagamento, forma, parkingName, selected, currentUser);
  }

  private persistLocalPayment(pagamento: any, forma: string, parkingName: string, selected: any, currentUser: any) {
    this.paymentHistoryService.salvarPagamento(pagamento).subscribe({
      next: (res) => {
        this.loading = false;
        console.log('Pagamento salvo com sucesso', res);
        const savedPaymentId = (res as any)?.id;
        if (savedPaymentId) {
          this.currentPaymentId = savedPaymentId;
        }

        const estacionamentoId = selected.id || selected.estacionamentoId || selected.idEstacionamento || selected.parkingId;
        if (estacionamentoId) {
          const reserva = {
            cliente: { id: currentUser.id },
            estacionamento: { id: estacionamentoId },
            horario: new Date()
          };
          this.reservaService.criarReserva(reserva).subscribe(() => {
            console.log('Reserva criada e vinculada ao estacionamento!');
          });
        }

        const dialogRef = this.dialog.open(SucessoModalComponent, {
          data: {
            title: 'Pagamento Confirmado',
            prefix: `Pagamento realizado com sucesso via ${this.selectedPaymentMethod}. Você pode ver seu QR na guia `,
            linkText: 'Minhas Reservas',
            linkTo: ['/minhas-reservas'],
            suffix: '. Clique em fechar para seguir para a rota até o estacionamento.'
          }
        });

        this.preReservaService.confirmPayment();
        this.preReservaService.notifyPreReservaCancelled();
        dialogRef.afterClosed().subscribe(() => {
          this.navigateToRoutePage();
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Erro ao salvar pagamento:', error);

        if (forma === 'Carteira') {
          this.carteiraService.adicionarValor(this.totalValue, `Estorno - Pagamento de reserva - ${parkingName}`, 'ajuste');
        }

        this.dialog.open(ErrorDialogComponent, {
          data: {
            title: 'Erro no pagamento',
            message: 'Não foi possível finalizar o pagamento. Tente novamente.'
          }
        });
      }
    });
  }

  private buildCardPurchasePayload(parkingName: string, currentUser: any, forma: string): any | null {
    const number = (this.cardNumber || '').replace(/\D/g, '');
    const cvv = (this.cardCVV || '').replace(/\D/g, '');
    const expiryDigits = (this.cardExpiry || '').replace(/\D/g, '');
    if (expiryDigits.length !== 6) {
      return null;
    }

    const expMonth = expiryDigits.slice(0, 2);
    const expYear = expiryDigits.slice(2, 6);
    const holderName = (this.cardName || this.payerName || currentUser?.nomeCompleto || 'CLIENTE').trim();
    let holderTaxId = (this.payerDocument || currentUser?.cpf || '').replace(/\D/g, '');
    const method = forma === 'Cartão de Crédito' ? 'CREDIT_CARD' : 'DEBIT_CARD';

    if (!holderName) {
      return null;
    }

    // Em ambiente local/dev, permite teste de cartão mesmo sem CPF no perfil.
    if (holderTaxId.length !== 11) {
      if (!environment.production) {
        holderTaxId = '12345678909';
      } else {
        return null;
      }
    }

    return {
      method,
      amount: this.totalValue,
      description: `Pagamento reserva - ${parkingName}`,
      referenceId: `APP-${Date.now()}`,
      card: {
        number,
        exp_month: expMonth,
        exp_year: expYear,
        security_code: cvv,
        holder: {
          name: holderName,
          tax_id: holderTaxId
        }
      }
    };
  }

  private getCardDeclineReason(charge: any): string {
    const paymentResponse = charge?.payment_response || {};
    const code = paymentResponse?.code;
    const description = paymentResponse?.message || paymentResponse?.description;
    const status = charge?.status ? `Status: ${charge.status}.` : '';

    if (code || description) {
      return `${status} Cartao nao autorizado pelo PagBank.${code ? ` Codigo: ${code}.` : ''}${description ? ` Motivo: ${description}.` : ''}`.trim();
    }

    return `${status} Cartao nao autorizado pelo PagBank.`.trim();
  }

  private extractCardGatewayError(error: any): string {
    const fallback = 'Nao foi possivel autorizar o cartao no PagBank.';
    const raw = this.extractBackendErrorMessage(error, fallback);

    if (!raw) {
      return fallback;
    }

    if (raw.toLowerCase().includes('invalid_parameter')) {
      return 'Falha de configuracao da integracao de cartao no PagBank. Verifique os dados obrigatorios e tente novamente.';
    }

    return raw;
  }

  private validateCard(): string[] {
  const errors: string[] = [];
  // Remove qualquer caractere não numérico antes de validar Luhn
  const number = (this.cardNumber || '').replace(/\D/g, '');
    if (!number.match(/^\d{13,19}$/)) {
      errors.push('Número do cartão inválido (13-19 dígitos).');
    } else if (!this.luhnCheck(number)) {
      errors.push('Número do cartão falhou na validação Luhn.');
    }
    if (!this.cardName || this.cardName.trim().length < 3) {
      errors.push('Nome no cartão muito curto.');
    }
    // Validade MM/AAAA (normaliza para evitar falsos negativos)
    const expiryRaw = (this.cardExpiry || '').trim();
    let expiry = expiryRaw.replace(/[^\d/]/g, '');
    // Permite "MMAAAA" vindo de algum teclado e normaliza para "MM/AAAA"
    if (/^\d{6}$/.test(expiry)) {
      expiry = `${expiry.slice(0, 2)}/${expiry.slice(2)}`;
    }
    if (!/^\d{2}\/\d{4}$/.test(expiry)) {
      errors.push('Validade deve estar no formato MM/AAAA.');
    } else {
      const [mm, yy] = expiry.split('/');
      const month = parseInt(mm, 10);
      const year = parseInt(yy, 10);
      if (month < 1 || month > 12) {
        errors.push('Mês de validade inválido.');
      }
      const lastDay = new Date(year, month, 0).getDate();
      const expiryDate = new Date(year, month - 1, lastDay, 23, 59, 59);
      if (expiryDate < new Date()) {
        errors.push('Cartão expirado.');
      }
    }
    const cvv = this.cardCVV || '';
    if (this.cardBrand === 'AMEX') {
      if (!/^\d{4}$/.test(cvv)) errors.push('CVV do AMEX deve ter 4 dígitos.');
    } else if (this.cardBrand) {
      if (!/^\d{3}$/.test(cvv)) errors.push('CVV deve ter 3 dígitos.');
    } else {
      if (!/^\d{3,4}$/.test(cvv)) errors.push('CVV deve ter 3 ou 4 dígitos.');
    }
    return errors;
  }

  private luhnCheck(num: string): boolean {
    let sum = 0;
    let shouldDouble = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  ngOnDestroy(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }
  }

  navigateToRoutePage() {
    this.isRedirectingToRoute = true;

    if (!navigator.geolocation) {
      this.isRedirectingToRoute = false;
      alert('Geolocalização não suportada pelo navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };

        const parking = this.selectedParkings[0];
        console.log('Parking selecionado:', parking); // Veja o que aparece no console

        const parkingLocation = {
          lat: parking.latitude ?? parking.lat,
          lon: parking.longitude ?? parking.lon,
          title: parking.title,
          address: parking.address,
          phone: parking.phone,
          cep: parking.cep
        };

        localStorage.removeItem('paymentData');
        localStorage.removeItem('preReservaData');

        this.router.navigate(['/route'], {
          state: {
            origin: userLocation,
            destination: parkingLocation
          }
        }).catch(() => {
          this.isRedirectingToRoute = false;
        });
      },
      (error) => {
        this.isRedirectingToRoute = false;
        console.error('Erro ao obter localização:', error);
        alert('Não foi possível obter sua localização atual.');
      }
    );
  }

  cancelPayment() {
    localStorage.removeItem('paymentData');
    localStorage.removeItem('preReservaData');
    this.preReservaService.notifyPreReservaCancelled();
    const dialogRef = this.dialog.open(AlertDialogCancelComponent, {
      width: '350px',
      data: {
        title: 'Pagamento Cancelado',
        message: 'Seu pagamento foi cancelado. Você foi redirecionado para a página de estacionamentos'
      }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['/welcome'], {
        state: { paymentCancelled: true }
      });
    });
    this.router.navigate(['/welcome'], {
      state: {
        paymentCancelled: true
      }
    });
  }

  // Formatação de cartão de crédito conforme digitação
  onMaskedCardChange(value: string) {
    this.cardNumber = value;
    const digits = (value || '').replace(/\D/g, '').slice(0, 19);
    this.cardBrand = this.detectCardBrand(digits);
    // Ajusta CVV corrente se bandeira mudar
    if (this.cardBrand === 'AMEX') {
      this.cardCVV = (this.cardCVV || '').replace(/\D/g, '').slice(0, 4);
    } else {
      this.cardCVV = (this.cardCVV || '').replace(/\D/g, '').slice(0, 3);
    }
  }

  onExpiryChange(value: string) {
    this.cardExpiry = value;
  }

  onCvvChange(value: string) {
    this.cardCVV = value;
  }

  private detectCardBrand(digits: string): string {
    if (!digits) return '';
    if (/^4\d{0,}$/.test(digits)) return 'VISA';
    if (/^(5[1-5]\d{0,}|2(2[2-9]|[3-6]\d|7[01]|720)\d{0,})$/.test(digits)) return 'MASTERCARD';
    if (/^3[47]\d{0,}$/.test(digits)) return 'AMEX';
    if (/^3(?:0[0-5]|[68]\d)\d{0,}$/.test(digits)) return 'DINERS';
    if (/^6(?:011|5\d{2})\d{0,}$/.test(digits)) return 'DISCOVER';
    if (/^(?:2131|1800|35\d{0,})$/.test(digits)) return 'JCB';
    if (/^(4011(78|79)|431274|438935|451416|457393|504175|627780|636297|636368|650\d{2})\d{0,}$/.test(digits)) return 'ELO';
    if (/^(606282|3841)\d{0,}$/.test(digits)) return 'HIPERCARD';
    return '';
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Código copiado para a área de transferência!');
    }).catch(err => {
      console.error('Erro ao copiar o código: ', err);
    });
  }

  manualRefreshStatus(paymentId: number) {
    if (!paymentId) { return; }

    this.paymentHistoryService.consultarStatusPix(paymentId).subscribe({
      next: (r) => {
        this.pixStatus = r.status;
        this.pixDisplayKey = r.pixKey || this.pixDisplayKey || this.pixKey;
        if (r.qrBase64) {
          this.pixQrBase64 = `data:image/png;base64,${r.qrBase64}`;
        }
        if (r.qrPayload) {
          this.pixQrPayload = r.qrPayload;
        }
        if (this.isPixPaymentCompleted(r.status, r.paymentStatus)) {
          this.handlePixPaidSuccess();
        }
      },
      error: () => {
        this.errorMsg = 'Falha ao consultar status. Tente novamente.';
      }
    });
  }

  reiniciarPix(paymentId: number) {
    if (this.pollingSub) { this.pollingSub.unsubscribe(); }
    this.errorMsg = '';
    this.pixQrBase64 = '';
    this.pixQrPayload = '';
    this.pixStatus = '';
    this.isProcessingPayment = true;
    this.paymentHistoryService.iniciarPix(paymentId, { pixKey: this.pixKey }).subscribe({
      next: r => {
        this.pixChargeId = r.pagbankChargeId || '';
        const normalizedStatus = (r.status || '').toUpperCase();
        const hasQrData = !!(r.qrBase64 || r.qrPayload);
        const isUntrackable = normalizedStatus === 'UNTRACKABLE';
        if (!this.pixChargeId && (isUntrackable || !hasQrData)) {
          this.isProcessingPayment = false;
          this.loading = false;
          this.errorMsg = 'Falha na integração PIX: cobrança não rastreável no PagBank.';
          return;
        }
        this.pixStatus = r.status || 'WAITING';
        this.pixDisplayKey = r.pixKey || this.pixDisplayKey || this.pixKey;
        if (r.qrBase64) this.pixQrBase64 = `data:image/png;base64,${r.qrBase64}`;
        if (r.qrPayload) this.pixQrPayload = r.qrPayload;
        // reinicia polling
        this.pollingCount = 0;
        this.pollingSub = interval(3000).pipe(
          switchMap(() => this.paymentHistoryService.consultarStatusPix(paymentId)),
          catchError(() => {
            this.errorMsg = 'Falha temporária ao consultar PIX. Tentando novamente...';
            return of({ status: this.pixStatus || 'WAITING' } as { status: string; paymentStatus?: string });
          })
        ).subscribe((statusResp: { status: string; paymentStatus?: string }) => {
          this.pixStatus = statusResp.status;
          this.pollingCount++;
          if (this.isPixPaymentCompleted(statusResp.status, statusResp.paymentStatus)) {
            this.handlePixPaidSuccess();
          } else if (this.pollingCount >= this.maxPollingCount) {
            if (this.pollingSub) { this.pollingSub.unsubscribe(); }
            this.isProcessingPayment = false;
            this.loading = false;
            this.errorMsg = 'Tempo esgotado para confirmação do PIX. Você pode tentar novamente.';
          }
        });
      },
      error: (error) => {
        this.isProcessingPayment = false;
        this.loading = false;
        this.errorMsg = this.extractBackendErrorMessage(error, 'Falha ao reiniciar PIX. Tente novamente.');
      }
    });
  }

  private handlePixPaidSuccess() {
    if (this.pixCompletionTriggered) {
      return;
    }
    this.pixCompletionTriggered = true;
    this.pixStatus = 'PAID';
    this.isProcessingPayment = false;
    this.loading = false;
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }

    this.preReservaService.confirmPayment();
    const selected = this.selectedParkings[0];
    const currentUser = this.authService.getCurrentUser();
    const estacionamentoId = selected?.id || selected?.estacionamentoId || selected?.idEstacionamento || selected?.parkingId;

    if (estacionamentoId && currentUser?.id) {
      const reserva = {
        cliente: { id: currentUser.id },
        estacionamento: { id: estacionamentoId },
        horario: new Date()
      };
      this.reservaService.criarReserva(reserva).subscribe(() => {
        console.log('Reserva criada após pagamento PIX!');
      });
    }

    const dialogRef = this.dialog.open(SucessoModalComponent, {
      data: {
        title: 'Pagamento Confirmado',
        prefix: 'Pagamento efetuado com sucesso, você pode ver seu QR na guia ',
        linkText: 'Minhas Reservas',
        linkTo: ['/minhas-reservas'],
        suffix: '. Clique em fechar para seguir para a rota até o estacionamento.'
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.navigateToRoutePage();
    });
  }

  private isPixPaymentCompleted(pagbankStatus?: string, localPaymentStatus?: string): boolean {
    const normalizedGatewayStatus = (pagbankStatus || '').trim().toUpperCase();
    const normalizedLocalStatus = (localPaymentStatus || '').trim().toUpperCase();

    const paidGatewayStatuses = ['PAID', 'CONFIRMED', 'COMPLETED'];
    const paidLocalStatuses = ['PAGO', 'PAID'];

    return paidGatewayStatuses.includes(normalizedGatewayStatus) || paidLocalStatuses.includes(normalizedLocalStatus);
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

  filteredMarkers = this.selectedParkings.map(est => ({
    title: est.companyName,
    label: `R$${est.hourlyRate}/h`,
    address: est.address,
    latitude: est.latitude,
    longitude: est.longitude
  }));
}
