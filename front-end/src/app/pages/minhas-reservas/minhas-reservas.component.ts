import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentHistory } from 'src/app/models/payment-history.model';
import { AuthService } from 'src/app/services/auth.service';
import { PaymentHistoryService } from 'src/app/services/payment-history.service';

interface RenewalReservationState {
  paymentId: number;
  estacionamento: string;
  endereco?: string;
  latitude?: number;
  longitude?: number;
  dataReservaEntrada?: string;
  horarioReservaEntrada?: string;
  horarioReservaSaida?: string;
}

@Component({
  selector: 'app-minhas-reservas',
  templateUrl: './minhas-reservas.component.html',
  styleUrls: ['./minhas-reservas.component.scss']
})
export class MinhasReservasComponent implements OnInit {
  private readonly renewalStorageKey = 'pendingRenewalReservation';
  reservas: PaymentHistory[] = [];
  loading = true;
  error = '';
  showInfoPopup = true;

  constructor(
    private paymentHistoryService: PaymentHistoryService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReservas();
  }

  closeInfoPopup(): void {
    this.showInfoPopup = false;
  }

  loadReservas(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.loading = false;
      this.error = 'Usuário não autenticado.';
      return;
    }

    this.paymentHistoryService.getPaidReservations(currentUser.id).subscribe({
      next: (data) => {
        this.reservas = (data || [])
          .filter(r => (r.formaPagamento || '').toLowerCase() !== 'cancelado')
          .sort((a, b) => (b.id || 0) - (a.id || 0));
        this.loading = false;
      },
      error: () => {
        this.error = 'Não foi possível carregar suas reservas.';
        this.loading = false;
      }
    });
  }

  openReservationQr(reserva: PaymentHistory): void {
    if (!reserva?.id) {
      return;
    }
    this.router.navigate(['/qr-code'], {
      state: { paymentId: reserva.id }
    });
  }

  canRenewReservation(reserva: PaymentHistory): boolean {
    return !!reserva?.id && !!reserva?.estacionamento;
  }

  renewReservation(reserva: PaymentHistory): void {
    if (!this.canRenewReservation(reserva)) {
      return;
    }

    const renewalReservation: RenewalReservationState = {
      paymentId: reserva.id,
      estacionamento: reserva.estacionamento,
      endereco: reserva.endereco,
      latitude: reserva.latitude,
      longitude: reserva.longitude,
      dataReservaEntrada: reserva.dataReservaEntrada,
      horarioReservaEntrada: reserva.horarioReservaEntrada,
      horarioReservaSaida: reserva.horarioReservaSaida
    };

    localStorage.setItem(this.renewalStorageKey, JSON.stringify(renewalReservation));
    this.router.navigate(['/welcome'], {
      queryParams: { renewal: Date.now() },
      state: { renewalReservation }
    });
  }
}
