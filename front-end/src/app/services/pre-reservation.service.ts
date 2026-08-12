import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer, Subscription, Subject } from 'rxjs';

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

  preReservaCancelled$ = new Subject<void>();
  paymentCompleted$ = new Subject<void>();
  preReservaExpired$ = new Subject<void>();
  private expirationWatcherId: any;

  notifyPreReservaCancelled() {
    this.preReservaCancelled$.next();
  }

  constructor() { }

  startExpirationWatcher() {
    if (this.expirationWatcherId) {
      clearInterval(this.expirationWatcherId);
    }

    this.expirationWatcherId = setInterval(() => {
      this.checkAndExpireIfNeeded();
    }, 1000);
  }

  stopExpirationWatcher() {
    if (this.expirationWatcherId) {
      clearInterval(this.expirationWatcherId);
      this.expirationWatcherId = undefined;
    }
  }

  getCurrentReservation(): any {
    return this.reservationData.getValue();
  }
  // Salva a pré-reserva e inicia o temporizador
  startPreReservation(reservation: any) {
    this.reservationData.next(reservation);
    this.paymentConfirmed = false;
    this.startCountdown();
  }

  cancelPreReserva() {
    localStorage.removeItem('preReservaData');
    this.notifyPreReservaChange();
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
    // Limpa pré-reserva armazenada e notifica quem dependa do contador
    try { localStorage.removeItem('preReservaData'); } catch {}
    this.preReservaChange.next(true);
    this.paymentCompleted$.next();
  }

  // Limpa a pré-reserva após o tempo expirar
  clearPreReservation() {
    this.reservationData.next(null);
    this.countdownTime.next(0);
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  expirePreReservation() {
    this.clearPreReservation();
    try {
      localStorage.removeItem('preReservaData');
    } catch {}
    this.notifyPreReservaCancelled();
    this.notifyPreReservaChange();
    this.preReservaExpired$.next();
  }

  checkAndExpireIfNeeded(): boolean {
    let preReservaDataRaw: string | null = null;
    try {
      preReservaDataRaw = localStorage.getItem('preReservaData');
    } catch {
      return false;
    }

    if (!preReservaDataRaw) {
      return false;
    }

    try {
      const preReservaData = JSON.parse(preReservaDataRaw);
      const expirationTime = Number(preReservaData?.timestamp || 0) + (10 * 60 * 1000);
      if (!preReservaData?.timestamp || Date.now() < expirationTime) {
        return false;
      }

      this.expirePreReservation();
      return true;
    } catch {
      return false;
    }
  }

  isPaymentConfirmed(): boolean {
    return this.paymentConfirmed;
  }

  private preReservaChange = new BehaviorSubject<boolean>(false);
  preReservaChange$ = this.preReservaChange.asObservable();

  notifyPreReservaChange() {
    this.preReservaChange.next(true);
  }
}
