import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as {
      selectedParkings: any[];
      clienteName: string;
      reservaTime: string;
    };

    if (state) {
      this.selectedParkings = state.selectedParkings;
      this.clienteName = state.clienteName;
      this.reservaTime = state.reservaTime;
    }
  }

  ngOnInit(): void {
    this.generateAvailableTimes();
  }

  generateAvailableTimes() {
    for (let i = 7; i <= 22; i++) {
      const time = i < 10 ? `0${i}:00` : `${i}:00`;
      this.availableTimes.push(time);
    }
  }

  confirmReservation() {
    if (this.selectedTime) {
      console.log('Reserva Confirmada para os seguintes estacionamentos:');
      console.log(this.selectedParkings);
      console.log('Cliente:', this.clienteName);
      console.log('Horário da Reserva:', this.selectedTime);
      alert(`Reserva confirmada para ${this.selectedTime}!`);
    } else {
      alert('Por favor, selecione um horário.');
    }
  }
}
