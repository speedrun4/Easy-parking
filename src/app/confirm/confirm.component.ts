import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as moment from 'moment';

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
      this.calculateTotalValue();
    }
    this.minDate = new Date();
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
      console.log('Reserva Confirmada para os seguintes estacionamentos:');
      console.log(this.selectedParkings);
      console.log('Cliente:', this.clienteName);
      console.log('Horário da Reserva:', this.selectedTime);
      console.log('Data da Reserva:', this.selectedDate);
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
