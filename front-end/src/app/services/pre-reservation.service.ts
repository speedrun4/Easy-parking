import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PreReservationService {
  private reservationData = new BehaviorSubject<any>(null);
  reservation$ = this.reservationData.asObservable();

  private countdownTime = new BehaviorSubject<number>(600); // 10 minutos em segundos
  countdown$ = this.countdownTime.asObservable();

  private timerSubscription: Subscription | null = null;
  private paymentConfirmed = false;

  constructor() {}

  getCurrentReservation(): any {
    return this.reservationData.getValue();
  }
  // Salva a pré-reserva e inicia o temporizador
  startPreReservation(reservation: any) {
    this.reservationData.next(reservation);
    this.paymentConfirmed = false;
    this.startCountdown();
  }

  // Inicia o temporizador de 10 minutos
  private startCountdown() {
    this.countdownTime.next(600); // Reseta o contador para 10 minutos

  if (this.timerSubscription) {
    this.timerSubscription.unsubscribe();
  }

  this.timerSubscription = timer(0, 1000).subscribe(() => {
    const currentTime = this.countdownTime.getValue(); // Use getValue()

    if (currentTime > 0) {
      this.countdownTime.next(currentTime - 1);
    } else {
      this.clearPreReservation();
    }
  });
  }

  // Confirma o pagamento e para o temporizador
  confirmPayment() {
    this.paymentConfirmed = true;
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  // Limpa a pré-reserva após o tempo expirar
  clearPreReservation() {
    this.reservationData.next(null);
    this.countdownTime.next(0);
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  isPaymentConfirmed(): boolean {
    return this.paymentConfirmed;
  }
}
