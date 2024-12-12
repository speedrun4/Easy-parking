import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-confirm',
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.scss']
})
export class ConfirmComponent implements OnInit {

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
  private authSubscription: Subscription = new Subscription();

  constructor(private router: Router, private authService: AuthService, private location: Location) {
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
      return total + parking.hourlyRate;  // Supondo que o valor esteja em hourlyRate
    }, 0);
  }

  onDateChange(event: any) {
    this.selectedDate = event.value; // Aqui você captura o valor da data
  }

  confirmReservation() {
    if (this.selectedTime && this.selectedDate) {
      alert(`Reserva confirmada para ${moment(this.selectedDate).format('DD/MM/YYYY')} às ${this.selectedTime}! Favor realizar o pagamento para finalizar sua reserva`);
      this.router.navigate(['/payment'], {
        state: {
          totalValue: this.totalValue
        }
      });
    } else {
      alert('Por favor, selecione uma data e horário.');
    }
  }
}
