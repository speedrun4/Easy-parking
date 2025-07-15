import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as QRCode from 'qrcode';
import { PreReservationService } from 'src/app/services/pre-reservation.service';
import { MatDialog } from '@angular/material/dialog';
import { AlertDialogCancelComponent } from 'src/app/components/alert-dialog-cancel/alert-dialog-cancel.component';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements OnInit {

  totalValue: number = 0;
  selectedPaymentMethod: string = '';
  paymentMethods = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto'];
  qrCodeData: string = '';
  qrCodeImage: string = '';
  isProcessingPayment: boolean = false;
  loading: boolean = false;

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

  constructor(private router: Router, private preReservaService: PreReservationService, private dialog: MatDialog) {
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
      }

      if (!this.selectedParkings || this.selectedParkings.length === 0) {
        console.warn('Nenhum estacionamento selecionado encontrado.');
        this.router.navigate(['/']); // Redireciona para a página inicial
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
      this.qrCodeData = `Chave Pix: mourajuniorf@gmail.com | Valor: R$ ${this.totalValue.toFixed(2)}`;

      QRCode.toDataURL(this.qrCodeData)
        .then(url => {
          this.qrCodeImage = url;
        })
        .catch(err => {
          console.error(err);
        });
    } else {
      this.qrCodeImage = '';
    }
  }

  confirmPayment() {
    if (!this.selectedPaymentMethod) {
      alert('Selecione um método de pagamento.');
      return;
    }

    // Validação de dados
    if (this.selectedPaymentMethod === 'Cartão de Crédito' || this.selectedPaymentMethod === 'Cartão de Débito') {
      if (!this.cardNumber || !this.cardName || !this.cardExpiry || !this.cardCVV) {
        alert('Por favor, preencha todos os campos do cartão.');
        return;
      }
    }

    if (this.selectedPaymentMethod === 'Boleto') {
      if (!this.payerName || !this.payerDocument) {
        alert('Por favor, preencha o nome e CPF/CNPJ para gerar o boleto.');
        return;
      }
    }

    this.loading = true;

    if (this.selectedPaymentMethod === 'Pix') {
      this.isProcessingPayment = true;

      setTimeout(() => {
        this.isProcessingPayment = false;
        this.loading = false;
        alert('Pagamento via Pix confirmado com sucesso!');
        // Notifica o header para parar o contador
        this.preReservaService.notifyPreReservaCancelled();
        this.navigateToRoutePage();
      }, 3000);
    } else {
      setTimeout(() => {
        this.loading = false;
        alert(`Pagamento realizado com sucesso via ${this.selectedPaymentMethod}.`);
        // Notifica o header para parar o contador
        this.preReservaService.notifyPreReservaCancelled();
        this.navigateToRoutePage();
      }, 2000);
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

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Código copiado para a área de transferência!');
    }).catch(err => {
      console.error('Erro ao copiar o código: ', err);
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
