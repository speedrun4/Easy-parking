import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements OnInit {

  totalValue: number = 0; // valor total a pagar
  selectedPaymentMethod: string = ''; // método de pagamento escolhido
  paymentMethods = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto'];
  qrCodeData: string = '';
  qrCodeImage: string = '';
  isProcessingPayment: boolean = false;
  loading: boolean = false;

  // Campos de cartão de crédito e débito
  cardNumber: string = '';
  cardName: string = '';
  cardExpiry: string = '';
  cardCVV: string = '';

  // Campos de boleto
  payerName: string = '';
  payerDocument: string = ''; // CPF ou CNPJ

  showCreditCardForm: boolean = false; // controla a exibição do formulário de cartão de crédito
  showDebitCardForm: boolean = false; // controla a exibição do formulário de cartão de débito
  showBoletoForm: boolean = false; // controla a exibição do formulário de boleto
  selectedParkings: any[] = [];
  selectedDate: Date | null = null;
  selectedTime: string | null = null;

  constructor(private router: Router) { 
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as {
      totalValue: number;
      selectedDate: Date | null;
      selectedTime: string | null;
    };

    if (state) {
      this.totalValue = state.totalValue;
      this.selectedDate = state.selectedDate;
      this.selectedTime = state.selectedTime;
    }
  }

  ngOnInit(): void {
    const preReservaData = JSON.parse(localStorage.getItem('preReservaData') || '{}');
    if (preReservaData?.selectedParkings) {
      this.selectedParkings = preReservaData.selectedParkings;
  
      // Calcular o total removendo "R$" e "/h" dos valores
      this.totalValue = this.selectedParkings.reduce((total, parking) => {
        const valorLimpo = parking.label.replace('R$', '').replace('/h', '').trim();
        return total + parseFloat(valorLimpo);
      }, 0);
    }
  }

  confirmPayment() {
    if (!this.selectedPaymentMethod) {
      alert('Selecione um método de pagamento.');
      return;
    }

    this.loading = true;

    setTimeout(() => {
      alert(`Pagamento realizado com sucesso via ${this.selectedPaymentMethod}.`);

      // Após confirmação, navega para a página de boas-vindas com a rota traçada
      this.router.navigate(['/welcome'], {
        state: {
          paymentConfirmed: true
        }
      });

      // Para o carregamento
      this.loading = false;
    }, 2000); // Simulando um atraso no pagamento

    if (this.selectedPaymentMethod === 'Pix') {
      this.isProcessingPayment = true; // Ativar o estado de carregamento

      // Simulando uma confirmação de pagamento após 3 segundos (simulando API ou verificação externa)
      setTimeout(() => {
        this.isProcessingPayment = false; // Desativar o estado de carregamento
        alert('Pagamento via Pix confirmado com sucesso!');

        // Após confirmação, navega para a página de boas-vindas com a rota traçada
        this.router.navigate(['/welcome'], {
          state: {
            paymentConfirmed: true,
            origin: { lat: -23.55052, lng: -46.633308 }, // Coordenadas simuladas do ponto de partida (local atual)
            destination: { lat: -23.559616, lng: -46.658306 } // Coordenadas simuladas do destino (estacionamento)
          }
        });
      }, 3000); // Simulando um delay de 3 segundos para processar o pagamento
    } else {
      // Simula o processo de pagamento para outros métodos
      alert(`Pagamento realizado com sucesso via ${this.selectedPaymentMethod}.`);

      // Redireciona para a página de boas-vindas após o pagamento
      this.router.navigate(['/welcome'], {
        state: {
          paymentConfirmed: true
        }
      });
    }

    // Validação para Cartão de Crédito
    if (this.selectedPaymentMethod === 'Cartão de Crédito') {
      if (!this.cardNumber || !this.cardName || !this.cardExpiry || !this.cardCVV) {
        alert('Por favor, preencha todos os campos do cartão de crédito.');
        return;
      }
    }

    // Validação para Cartão de Débito
    if (this.selectedPaymentMethod === 'Cartão de Débito') {
      if (!this.cardNumber || !this.cardName || !this.cardExpiry || !this.cardCVV) {
        alert('Por favor, preencha todos os campos do cartão de débito.');
        return;
      }
    }

    // Validação para Boleto
    if (this.selectedPaymentMethod === 'Boleto') {
      if (!this.payerName || !this.payerDocument) {
        alert('Por favor, preencha o nome e CPF/CNPJ para gerar o boleto.');
        return;
      }
    }

    // Simula o processo de pagamento
    alert(`Pagamento realizado com sucesso via ${this.selectedPaymentMethod}.`);

    // Após confirmação, navega para a página de boas-vindas com a rota traçada
    this.router.navigate(['/welcome'], {
      state: {
        paymentConfirmed: true
      }
    });
  }

  cancelPayment() {
    // Apagar dados de pagamento (se necessário) e navegar para a página welcome
    this.router.navigate(['/welcome'], {
      state: {
        paymentCancelled: true // Podemos passar um estado se necessário
      }
    });
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Código copiado para a área de transferência!');
    }).catch(err => {
      console.error('Erro ao copiar o código: ', err);
    });
  }

  onPaymentMethodChange() {
    this.showCreditCardForm = this.selectedPaymentMethod === 'Cartão de Crédito';
    this.showDebitCardForm = this.selectedPaymentMethod === 'Cartão de Débito';
    this.showBoletoForm = this.selectedPaymentMethod === 'Boleto';

    if (this.selectedPaymentMethod === 'Pix') {
      // Gerar o código do Pix (pode ser um exemplo fixo ou dinâmico)
      this.qrCodeData = `Chave Pix: mourajuniorf@gmail.com | Valor: R$ ${this.totalValue.toFixed(2)}`;

      // Gerar o QR Code
      QRCode.toDataURL(this.qrCodeData)
        .then(url => {
          this.qrCodeImage = url;
        })
        .catch(err => {
          console.error(err);
        });
    } else {
      // Limpar o QR Code quando uma opção diferente for selecionada
      this.qrCodeImage = '';
    }
  }
}
