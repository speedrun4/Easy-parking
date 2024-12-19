import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';

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
  confirmationMessage: string = '';
  private authSubscription: Subscription = new Subscription();

  constructor(private router: Router, private authService: AuthService, private location: Location, private dialog: MatDialog) {
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
       // Preparando os dados da pré-reserva
       const preReservaData = {
        selectedParkings: this.selectedParkings.map((parking) => ({
          title: parking.title,
          label: parking.label,
          address: parking.address,
          selectedDate: parking.selectedDate,
          selectedTime: parking.selectedTime,
        })),
        timestamp: new Date().getTime(), // Salva o timestamp para controle de expiração
      };
  
      // Salva os dados no localStorage
      localStorage.setItem('preReservaData', JSON.stringify(preReservaData));
  
      // Exibe no console os dados confirmados
      console.log('Pré-reserva salva com sucesso:', preReservaData);
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '350px',
      data: {
        message: `Reserva pré-confirmada! Favor realizar o pagamento para finalizar sua reserva.
        Caso o pagamento não for confirmado dentro de 10 minutos sua reserva será cancelada! Caso você saia da pagina de pagamento, você pode visualizar a sua pré-reserva na barra de menu -> pré-reserva.`
      }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['/payment'], {
        state: {
          totalValue: this.totalValue,
          selectedDate: this.selectedDate || null, // Inclua a data, mesmo que seja nula
          selectedTime: this.selectedTime || null // Inclua o horário, mesmo que seja nulo
        }
      });
    });
  }
}
