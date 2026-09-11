import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { AuthService } from './auth.service';
import { PaymentHistoryService } from './payment-history.service';
import { PaymentHistory } from '../models/payment-history.model';

interface LocalReminderPlugin {
  scheduleReservationAlert(options: {
    id: number;
    triggerAtMillis: number;
    title: string;
    body: string;
    route: string;
  }): Promise<void>;
  cancelReservationAlert(options: { id: number }): Promise<{ cancelled: boolean }>;
}

const localReminder = registerPlugin<LocalReminderPlugin>('LocalReminder');

/**
 * Agenda um alerta (notificação nativa no Android, ou notificação/timeout no navegador)
 * avisando o usuário 5 minutos antes do fim de cada reserva ativa, perguntando se deseja
 * renovar. Ao tocar no alerta, o usuário é levado direto para "Minhas Reservas".
 */
@Injectable({
  providedIn: 'root'
})
export class ParkingExpirationAlertService {
  private started = false;
  private pollTimer?: ReturnType<typeof setInterval>;
  private webTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private scheduledIds = new Set<number>();
  private readonly pollIntervalMs = 60 * 1000;
  private readonly alertLeadTimeMs = 5 * 60 * 1000;

  constructor(
    private authService: AuthService,
    private paymentHistoryService: PaymentHistoryService
  ) {}

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    this.requestWebNotificationPermissionIfNeeded();
    this.refreshSchedules();
    this.pollTimer = setInterval(() => this.refreshSchedules(), this.pollIntervalMs);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.webTimers.forEach((timer) => clearTimeout(timer));
    this.webTimers.clear();
    this.scheduledIds.clear();
    this.started = false;
  }

  private refreshSchedules(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return;
    }

    this.paymentHistoryService.getPaidReservations(currentUser.id).subscribe({
      next: (reservas) => this.scheduleAlertsForReservations(reservas || []),
      error: () => {
        // Ignora silenciosamente: tentaremos novamente no próximo ciclo de polling.
      }
    });
  }

  private scheduleAlertsForReservations(reservas: PaymentHistory[]): void {
    const activeIds = new Set<number>();

    reservas
      .filter((r) => (r.formaPagamento || '').toLowerCase() !== 'cancelado')
      .forEach((reserva) => {
        const exitDateTime = this.getReservationExitDateTime(reserva);
        if (!reserva?.id || !exitDateTime) {
          return;
        }

        const alertTime = exitDateTime.getTime() - this.alertLeadTimeMs;
        // Só agenda se o alerta ainda não passou (com tolerância de 1 min para não perder
        // a janela por causa do intervalo de polling) e ainda não vencemos a reserva.
        if (alertTime <= Date.now() - 60000 || exitDateTime.getTime() <= Date.now()) {
          return;
        }

        activeIds.add(reserva.id);
        if (this.scheduledIds.has(reserva.id)) {
          return; // já agendado nesse ciclo de vida do app
        }

        this.scheduledIds.add(reserva.id);
        this.scheduleAlert(reserva, alertTime);
      });

    // Cancela alertas de reservas que não estão mais ativas (renovadas, canceladas, etc.)
    Array.from(this.scheduledIds)
      .filter((id) => !activeIds.has(id))
      .forEach((id) => this.cancelAlert(id));
  }

  private scheduleAlert(reserva: PaymentHistory, alertAtMillis: number): void {
    const title = 'Sua reserva está acabando';
    const body = `Faltam 5 minutos para o fim da reserva em ${reserva.estacionamento}. Deseja renovar?`;
    const route = '/minhas-reservas';

    if (Capacitor.getPlatform() === 'android') {
      localReminder
        .scheduleReservationAlert({
          id: reserva.id,
          triggerAtMillis: alertAtMillis,
          title,
          body,
          route
        })
        .catch(() => {
          this.scheduledIds.delete(reserva.id);
        });
      return;
    }

    // Fallback para navegador: agenda via setTimeout + Notification API.
    const delay = Math.max(0, alertAtMillis - Date.now());
    const timer = setTimeout(() => {
      this.showWebNotification(title, body, route);
      this.webTimers.delete(reserva.id);
    }, delay);
    this.webTimers.set(reserva.id, timer);
  }

  private cancelAlert(id: number): void {
    this.scheduledIds.delete(id);

    if (Capacitor.getPlatform() === 'android') {
      localReminder.cancelReservationAlert({ id }).catch(() => {});
      return;
    }

    const timer = this.webTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.webTimers.delete(id);
    }
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

  private requestWebNotificationPermissionIfNeeded(): void {
    if (Capacitor.getPlatform() === 'android') {
      return; // permissão tratada nativamente pelo Android
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  private showWebNotification(title: string, body: string, route: string): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }
    const notification = new Notification(title, { body });
    notification.onclick = () => {
      window.focus();
      window.location.href = route;
      notification.close();
    };
  }
}
