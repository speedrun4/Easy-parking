import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import * as QRCode from 'qrcode';
import { PreReservationService } from 'src/app/services/pre-reservation.service';
import { MatDialog } from '@angular/material/dialog';
import { AlertDialogCancelComponent } from 'src/app/components/alert-dialog-cancel/alert-dialog-cancel.component';
import { SucessoModalComponent } from 'src/app/components/sucess-modal/sucess-modal.component';
import { ErrorDialogComponent } from 'src/app/components/error-dialog/error-dialog.component';
import { PixProgressModalComponent } from 'src/app/components/pix-progress-modal/pix-progress-modal.component';
import { PaymentHistoryService } from 'src/app/services/payment-history.service';
import { AuthService } from 'src/app/services/auth.service';
import { ReservaService } from 'src/app/services/reserva.service';


@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements OnInit, OnDestroy {

  totalValue: number = 0;
  selectedPaymentMethod: string = '';
  paymentMethods = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto'];
  qrCodeData: string = '';
  qrCodeImage: string = '';
  pixQrBase64: string = '';
  pixQrPayload: string = '';
  pixStatus: string = '';
  pixChargeId: string = '';
  isProcessingPayment: boolean = false;
  cardBrand: string = '';
  loading: boolean = false;
  private pollingSub?: Subscription;
  private pollingCount = 0;
  private maxPollingCount = 100; // ~5 min com intervalo 3s
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
  showBoletoForm: boolean = false;
  selectedParkings: any[] = [];
  selectedDate: Date | null = null;
  selectedTime: string | null = null;
  paymentData: any = null;

  constructor(
    private router: Router,
    private preReservaService: PreReservationService,
    private dialog: MatDialog,
    private paymentHistoryService: PaymentHistoryService,
    private authService: AuthService,
    private reservaService: ReservaService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as {
      totalValue: number;
      selectedDate: Date | null;
      selectedTime: string | null;
      selectedParkings: any[];
    };

    if (state) {
      this.totalValue = state.totalValue;
      this.selectedDate = state.selectedDate;
      this.selectedTime = state.selectedTime;
      this.selectedParkings = state.selectedParkings || [];
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
        if (this.paymentData.totalValue) {
          this.totalValue = this.paymentData.totalValue;
        }
      }

      if (!this.selectedParkings || this.selectedParkings.length === 0) {
        console.warn('Nenhum estacionamento selecionado encontrado.');
        this.router.navigate(['/']);
      }
    } catch (error) {
      console.error('Erro ao carregar os dados de pagamento:', error);
      this.router.navigate(['/']);
    }
  }

  isPaymentMethodValid() {
    return this.selectedPaymentMethod === 'Cartão de Crédito' ||
      this.selectedPaymentMethod === 'Cartão de Débito' ||
      this.selectedPaymentMethod === 'Boleto';
  }

  onPaymentMethodChange() {
    this.showCreditCardForm = this.selectedPaymentMethod === 'Cartão de Crédito';
    this.showDebitCardForm = this.selectedPaymentMethod === 'Cartão de Débito';
    this.showBoletoForm = this.selectedPaymentMethod === 'Boleto';

    if (this.selectedPaymentMethod === 'Pix') {
      // Limpa visuais antigos; será preenchido após criar cobrança no backend
      this.qrCodeData = '';
      this.qrCodeImage = '';
      this.pixQrBase64 = '';
      this.pixQrPayload = '';
    } else {
      this.qrCodeImage = '';
    }
  }

  confirmPayment() {
  // Ao clicar em confirmar, parar e ocultar imediatamente o contador do header
  this.preReservaService.notifyPreReservaCancelled();
  console.log('selectedParkings no pagamento:', this.selectedParkings);
  // Força o campo horaSaida a existir, mesmo que venha como selectedExitTime
  this.selectedParkings = this.selectedParkings.map(p => ({
    ...p,
    horaSaida: p.horaSaida || p.selectedExitTime || p.selectedHoraSaida || null
  }));
  const selected = this.selectedParkings[0];
  console.log('Valor de horário de saída enviado:', selected.horaSaida);
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

    const forma = this.selectedPaymentMethod === 'Pix' ? 'PIX' : this.selectedPaymentMethod;
    const pagamento: any = {
      nome: this.cardName || this.payerName || 'Usuário Pix',
      formaPagamento: forma,
      valorPago: this.totalValue,
      estacionamento: selected.title,
      latitude: selected.latitude ?? selected.lat,
      longitude: selected.longitude ?? selected.lon,
      endereco: selected.address,
      usuario: { id: currentUser.id },
      // status será definido no backend (para PIX começa como aguardando_pagamento)
  dataReservaEntrada: formatDateISO(selected.selectedDate || selected.data || null),
  horarioReservaEntrada: selected.selectedTime || selected.horaEntrada || selected.horarioEntrada || null,
  horarioReservaSaida: padTime(selected.horaSaida || null)
    };

    this.paymentHistoryService.salvarPagamento(pagamento).subscribe({
      next: (res) => {
        console.log('Pagamento salvo com sucesso', res);
  const savedPaymentId = (res as any)?.id;
  this.currentPaymentId = savedPaymentId || null;

        // Se PIX, inicia a cobrança e exibe QR com polling de status
        if (forma === 'PIX' && savedPaymentId) {
          this.isProcessingPayment = true;
          const dialogRef = this.dialog.open(PixProgressModalComponent, {
            data: {
              paymentId: savedPaymentId,
              status: 'INICIANDO',
              qrBase64: null,
              qrPayload: null
            }
          });
          this.paymentHistoryService.iniciarPix(savedPaymentId).subscribe({
            next: r => {
              this.pixChargeId = r.pagbankChargeId || '';
              this.pixStatus = r.status || 'WAITING';
              if (r.qrBase64) {
                this.pixQrBase64 = `data:image/png;base64,${r.qrBase64}`;
              }
              if (r.qrPayload) {
                this.pixQrPayload = r.qrPayload;
              }
              // atualiza modal
              if (dialogRef && dialogRef.componentInstance) {
                dialogRef.componentInstance.status = this.pixStatus;
                dialogRef.componentInstance.qrBase64 = this.pixQrBase64;
                dialogRef.componentInstance.qrPayload = this.pixQrPayload;
              }
              // inicia polling a cada 3s
              this.pollingCount = 0;
              this.pollingSub = interval(3000).pipe(
                switchMap(() => this.paymentHistoryService.consultarStatusPix(savedPaymentId))
              ).subscribe((statusResp: { status: string }) => {
                this.pixStatus = statusResp.status;
                this.pollingCount++;
                if (dialogRef && dialogRef.componentInstance) {
                  dialogRef.componentInstance.status = this.pixStatus;
                }
                if (statusResp.status && statusResp.status.toUpperCase() === 'PAID') {
                  this.isProcessingPayment = false;
                  this.loading = false;
                  if (this.pollingSub) { this.pollingSub.unsubscribe(); }
                  // cria reserva somente após confirmar pagamento
                  // interrompe contador pré-reserva
                  this.preReservaService.confirmPayment();
                  const estacionamentoId = selected.id || selected.estacionamentoId || selected.idEstacionamento || selected.parkingId;
                  if (estacionamentoId) {
                    const reserva = {
                      cliente: { id: currentUser.id },
                      estacionamento: { id: estacionamentoId },
                      horario: new Date()
                    };
                    this.reservaService.criarReserva(reserva).subscribe(() => {
                      console.log('Reserva criada após pagamento PIX!');
                    });
                  }
                  const successRef = this.dialog.open(SucessoModalComponent, {
                    data: {
                      title: 'Pagamento Confirmado',
                      prefix: 'Pagamento efetuado com sucesso, você pode ver seu QR na guia ',
                      linkText: 'Meus QrCodes',
                      linkTo: ['/qr-code'],
                      suffix: '. Clique em fechar para seguir para a rota até o estacionamento.'
                    }
                  });
                  successRef.afterClosed().subscribe(() => {
                    this.navigateToRoutePage();
                  });
                  dialogRef.close();
                } else if (this.pollingCount >= this.maxPollingCount) {
                  // timeout
                  if (this.pollingSub) { this.pollingSub.unsubscribe(); }
                  this.isProcessingPayment = false;
                  this.loading = false;
                  this.errorMsg = 'Tempo esgotado para confirmação do PIX. Você pode tentar novamente.';
                  if (dialogRef && dialogRef.componentInstance) {
                    dialogRef.componentInstance.status = 'TIMEOUT';
                    dialogRef.componentInstance.errorMsg = this.errorMsg;
                  }
                }
              });
            },
            error: err => {
              this.isProcessingPayment = false;
              this.loading = false;
              this.errorMsg = 'Não foi possível iniciar o PIX. Tente novamente.';
              console.error('Falha ao iniciar PIX:', err);
              if (dialogRef && dialogRef.componentInstance) {
                dialogRef.componentInstance.status = 'ERRO';
                dialogRef.componentInstance.errorMsg = this.errorMsg;
              }
            }
          });
        } else {
          // Outras formas seguem fluxo anterior
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
          // Armazena o id do pagamento para uso posterior (se necessário)
          if (savedPaymentId) {
            this.currentPaymentId = savedPaymentId;
          }
        }
      },
      error: (error) => {
        console.error('Erro ao salvar pagamento:', error);
      }
    });

    // Validação de método de pagamento
    if (!this.selectedPaymentMethod) {
      this.dialog.open(SucessoModalComponent, {
        data: {
          title: 'Atenção',
          message: 'Selecione um método de pagamento.'
        }
      });
      return;
    }

    // Validação de dados
    if (this.selectedPaymentMethod === 'Cartão de Crédito' || this.selectedPaymentMethod === 'Cartão de Débito') {
      const cardErrors = this.validateCard();
      if (cardErrors.length) {
        this.dialog.open(ErrorDialogComponent, {
          data: { title: 'Erro de Cartão', message: cardErrors.join('\n') }
        });
        return;
      }
    }

    if (this.selectedPaymentMethod === 'Boleto') {
      if (!this.payerName || !this.payerDocument) {
        this.dialog.open(SucessoModalComponent, {
          data: {
            title: 'Atenção',
            message: 'Por favor, preencha o nome e CPF/CNPJ para gerar o boleto.'
          }
        });
        return;
      }
    }

    this.loading = true;

    if (this.selectedPaymentMethod !== 'Pix') {
      setTimeout(() => {
        this.loading = false;
          const dialogRef = this.dialog.open(SucessoModalComponent, {
            data: {
              title: 'Pagamento Confirmado',
              prefix: `Pagamento realizado com sucesso via ${this.selectedPaymentMethod}. Você pode ver seu QR na guia `,
              linkText: 'Meus QrCodes',
              linkTo: ['/qr-code'],
              suffix: '. Clique em fechar para seguir para a rota até o estacionamento.'
            }
          });
        // marca pagamento concluído para interromper contador de pré-reserva
        this.preReservaService.confirmPayment();
        this.preReservaService.notifyPreReservaCancelled();
        dialogRef.afterClosed().subscribe(() => {
          this.navigateToRoutePage();
        });
      }, 2000);
    }
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
    if (!navigator.geolocation) {
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
        });
      },
      (error) => {
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
    this.paymentHistoryService.iniciarPix(paymentId).subscribe({
      next: r => {
        this.pixChargeId = r.pagbankChargeId || '';
        this.pixStatus = r.status || 'WAITING';
        if (r.qrBase64) this.pixQrBase64 = `data:image/png;base64,${r.qrBase64}`;
        if (r.qrPayload) this.pixQrPayload = r.qrPayload;
        // reinicia polling
        this.pollingCount = 0;
        this.pollingSub = interval(3000).pipe(
          switchMap(() => this.paymentHistoryService.consultarStatusPix(paymentId))
        ).subscribe((statusResp: { status: string }) => {
          this.pixStatus = statusResp.status;
          this.pollingCount++;
          if (statusResp.status && statusResp.status.toUpperCase() === 'PAID') {
            this.isProcessingPayment = false;
            this.loading = false;
            if (this.pollingSub) { this.pollingSub.unsubscribe(); }
          } else if (this.pollingCount >= this.maxPollingCount) {
            if (this.pollingSub) { this.pollingSub.unsubscribe(); }
            this.isProcessingPayment = false;
            this.loading = false;
            this.errorMsg = 'Tempo esgotado para confirmação do PIX. Você pode tentar novamente.';
          }
        });
      },
      error: () => {
        this.isProcessingPayment = false;
        this.loading = false;
        this.errorMsg = 'Falha ao reiniciar PIX. Tente novamente.';
      }
    });
  }

  simularPix() {
    const id = this.currentPaymentId;
    if (!id) { return; }
    this.paymentHistoryService.simularPagamentoPix(id).subscribe({
      next: (r) => {
        this.pixStatus = 'PAID';
        // dispara os mesmos efeitos do sucesso real: parar contador, criar reserva e navegar
        this.preReservaService.confirmPayment();
        const selected = this.selectedParkings[0];
        const currentUser = this.authService.getCurrentUser();
        const estacionamentoId = selected?.id || selected?.estacionamentoId || selected?.idEstacionamento || selected?.parkingId;
        if (estacionamentoId && currentUser?.id) {
          const reserva = { cliente: { id: currentUser.id }, estacionamento: { id: estacionamentoId }, horario: new Date() };
          this.reservaService.criarReserva(reserva).subscribe(() => {});
        }
        const dialogRef = this.dialog.open(SucessoModalComponent, { 
          data: { 
            title: 'Pagamento Confirmado',
            prefix: 'Pagamento efetuado com sucesso (simulado). Você pode ver seu QR na guia ',
            linkText: 'Meus QrCodes',
            linkTo: ['/qr-code'],
            suffix: '. Clique em fechar para seguir para a rota até o estacionamento.'
          } 
        });
        dialogRef.afterClosed().subscribe(() => {
          this.navigateToRoutePage();
        });
      },
      error: () => {
        this.errorMsg = 'Falha ao simular pagamento. Disponível somente no sandbox.';
      }
    });
  }

  filteredMarkers = this.selectedParkings.map(est => ({
    title: est.companyName,
    label: `R$${est.hourlyRate}/h`,
    address: est.address,
    latitude: est.latitude,
    longitude: est.longitude
  }));
}
