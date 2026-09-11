import { Component, OnDestroy, OnInit } from '@angular/core';
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
export class MinhasReservasComponent implements OnInit, OnDestroy {
  private readonly renewalStorageKey = 'pendingRenewalReservation';
  private renewalAvailabilityTimer?: ReturnType<typeof setInterval>;
  currentTime = new Date();
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
    this.renewalAvailabilityTimer = setInterval(() => {
      this.currentTime = new Date();
    }, 30000);
    this.loadReservas();
  }

  ngOnDestroy(): void {
    if (this.renewalAvailabilityTimer) {
      clearInterval(this.renewalAvailabilityTimer);
    }
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
          .filter(r => this.hasReservationDetails(r))
          .sort((a, b) => (b.id || 0) - (a.id || 0));
        this.loading = false;
      },
      error: () => {
        this.error = 'Não foi possível carregar suas reservas.';
        this.loading = false;
      }
    });
  }

  private hasReservationDetails(reserva: PaymentHistory): boolean {
    return !!reserva?.estacionamento?.trim() &&
      !!reserva?.endereco?.trim() &&
      !!reserva?.dataReservaEntrada &&
      !!reserva?.horarioReservaEntrada &&
      !!reserva?.horarioReservaSaida;
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
    const exitDateTime = this.getReservationExitDateTime(reserva);
    if (!reserva?.id || !reserva?.estacionamento || !exitDateTime) {
      return false;
    }

    const renewalStart = new Date(exitDateTime.getTime() - 5 * 60 * 1000);
    return this.currentTime >= renewalStart && this.currentTime <= exitDateTime;
  }

  getRenewalAvailabilityMessage(reserva: PaymentHistory): string {
    if (this.canRenewReservation(reserva)) {
      return 'Renovacao disponivel ate o horario de saida.';
    }

    return 'Disponivel apenas nos 5 minutos antes do horario de saida.';
  }

  private getReservationExitDateTime(reserva: PaymentHistory): Date | null {
    const date = (reserva?.dataReservaEntrada || '').trim();
    const time = (reserva?.horarioReservaSaida || '').trim();
    if (!date || !time || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) {
      return null;
    }

    const exitDateTime = new Date(`${date}T${time}`);
    return Number.isNaN(exitDateTime.getTime()) ? null : exitDateTime;
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
