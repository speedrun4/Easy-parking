import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';
import { PreReservationService } from 'src/app/services/pre-reservation.service';

@Component({
  selector: 'app-confirm',
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.scss']
})
export class ConfirmComponent implements OnInit {
  private readonly advanceBookingHours = 24;
  private readonly advanceBookingDiscountRate = 0.05;

  selectedParkings: any[] = [];  // Lista de estacionamentos selecionados
  clienteName: string = '';  // Nome do cliente
  reservaTime: string = '';  // Horário da reserva
  availableTimes: string[] = [];  // Lista de horários disponíveis
  selectedTime: string = '';
  selectedDate: Date | null = null; // Data selecionada
  minDate: Date;
  totalValue: number = 0;
  userName: string = '';
  isLoggedIn = false;
  isClient = false;
  loginAsUser: boolean = false;
  confirmationMessage: string = '';
  private authSubscription: Subscription = new Subscription();

  constructor(private router: Router, private authService: AuthService, private location: Location, private dialog: MatDialog, private preReservaService: PreReservationService) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as {
      selectedParkings: any[];
      clienteName: string;
      reservaTime: string;
    };

    if (state) {
      this.selectedParkings = state.selectedParkings.map((parking) => ({
        ...parking,
        selectedDate: parking.selectedDate || null,
        selectedTime: parking.selectedTime || null,
      }));
      this.clienteName = state.clienteName;
      this.calculateTotalValue();
    }
    this.minDate = new Date();
  }

  ngOnInit(): void {
    console.log('Dados recebidos:', this.selectedParkings);
    this.authSubscription = this.authService.currentUser.subscribe(user => {
      this.isLoggedIn = !!user;
      if (user) {
        this.userName = user.nomeCompleto?.split(' ').slice(0, 2).join(' ') || '';
        this.isClient = user.isClient; // Perfil cliente
        this.loginAsUser = user.loginAsUser; // Tipo de login realizado
      } else {
        this.userName = '';
        this.isClient = false;
      }
    });
    this.generateAvailableTimes();
  }
  cancelReservation() {
    this.location.back();
  }
  generateAvailableTimes() {
    for (let i = 7; i <= 22; i++) {
      const time = i < 10 ? `0${i}:00` : `${i}:00`;
      this.availableTimes.push(time);
    }
  }
  calculateTotalValue() {
    this.totalValue = this.selectedParkings.reduce((total, parking) => {
      return total + this.calculateParkingTotal(parking);
    }, 0);
  }

  getParkingBaseTotal(parking: any): number {
    return this.calculateBaseParkingTotal(parking);
  }

  isAdvanceBookingEligible(parking: any): boolean {
    const reservationDateTime = this.getReservationDateTime(parking?.selectedDate, parking?.selectedTime);
    if (!reservationDateTime) {
      return false;
    }

    const now = new Date();
    const diffHours = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours >= this.advanceBookingHours;
  }

  getAdvanceBookingDiscount(parking: any): number {
    const baseTotal = this.getParkingBaseTotal(parking);
    if (!baseTotal || !this.isAdvanceBookingEligible(parking)) {
      return 0;
    }
    return Math.round(baseTotal * this.advanceBookingDiscountRate * 100) / 100;
  }

  calculateParkingTotal(parking: any): number {
    const baseTotal = this.getParkingBaseTotal(parking);
    if (!baseTotal) {
      return 0;
    }

    const discount = this.getAdvanceBookingDiscount(parking);
    const totalWithDiscount = baseTotal - discount;
    return Math.round(totalWithDiscount * 100) / 100;
  }

  private calculateBaseParkingTotal(parking: any): number {
    if (!parking?.selectedTime) return 0;

    if (parking.useDaily12h) {
      const dailyRate = Number(parking.dailyRate12h || 0);
      return Math.ceil(dailyRate * 100) / 100;
    }

    if (!parking.selectedExitTime) return 0;

    const [startHour, startMinute] = parking.selectedTime.split(':').map(Number);
    const [endHour, endMinute] = parking.selectedExitTime.split(':').map(Number);

    const start = new Date();
    start.setHours(startHour, startMinute, 0);

    const end = new Date();
    end.setHours(endHour, endMinute, 0);

    let diffMs = end.getTime() - start.getTime();

    if (diffMs <= 0) {
      // Se a saída for no dia seguinte
      diffMs += 24 * 60 * 60 * 1000;
    }

    const diffHours = diffMs / (1000 * 60 * 60);

    const hourlyRate = Number(parking.hourlyRate || parking.label.replace(/[^\d.-]/g, '')) || 0;

    const total = diffHours * hourlyRate;
    return Math.ceil(total * 100) / 100;
  }

  private getReservationDateTime(dateValue: string | Date, timeValue: string): Date | null {
    if (!dateValue || !timeValue || !timeValue.includes(':')) {
      return null;
    }

    const [hour, minute] = timeValue.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return null;
    }

    const reservationDate = dateValue instanceof Date ? new Date(dateValue) : this.parseDateString(dateValue);
    if (!reservationDate) {
      return null;
    }

    reservationDate.setHours(hour, minute, 0, 0);
    return reservationDate;
  }

  private parseDateString(value: string): Date | null {
    if (!value) {
      return null;
    }

    if (value.includes('/')) {
      const [day, month, year] = value.split('/').map(Number);
      if ([day, month, year].some(Number.isNaN)) {
        return null;
      }
      return new Date(year, month - 1, day);
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  onDateChange(event: any) {
    this.selectedDate = event.value; // Aqui você captura o valor da data
  }

  confirmReservation() {
    // Preparando os dados da pré-reserva
    const preReservaData = {
      selectedParkings: this.selectedParkings.map((parking) => {
        const baseTotal = this.getParkingBaseTotal(parking);
        const discountAmount = this.getAdvanceBookingDiscount(parking);

        return {
          title: parking.title,
          label: parking.label,
          hourlyRate: parking.hourlyRate,
          dailyRate12h: parking.dailyRate12h,
          useDaily12h: !!parking.useDaily12h,
          address: parking.address,
          latitude: parking.latitude,
          longitude: parking.longitude,
          selectedDate: parking.selectedDate,
          selectedTime: parking.selectedTime,
          selectedExitTime: parking.selectedExitTime,
          baseTotal,
          discountAmount,
          total: Math.round((baseTotal - discountAmount) * 100) / 100
        };
      }),
      timestamp: new Date().getTime(),
    };

    // Salva os dados no localStorage
    localStorage.setItem('preReservaData', JSON.stringify(preReservaData));
    this.preReservaService.notifyPreReservaChange(); // Notifica a mudança

    // Exibe no console os dados confirmados
    console.log('Pré-reserva salva com sucesso:', preReservaData);
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '350px',
      disableClose: true,
      data: {
        title: 'Reserva pré-confirmada',
        singleAction: true,
        confirmText: 'OK',
        message: `Reserva pré-confirmada! Favor realizar o pagamento para finalizar sua reserva.
        Caso o pagamento não for confirmado dentro de 10 minutos sua reserva será cancelada! Caso você saia da pagina de pagamento, você pode visualizar a sua pré-reserva na barra de menu -> pré-reserva.`
      }
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed !== true) {
        return;
      }
      this.router.navigate(['/payment'], {
        state: {
          totalValue: this.totalValue,
          selectedDate: this.selectedDate || null,
          selectedTime: this.selectedTime || null,
          selectedParkings: preReservaData.selectedParkings
        }
      });
    });
  }
}
