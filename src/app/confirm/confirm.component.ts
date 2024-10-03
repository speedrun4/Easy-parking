import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-confirm',
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.scss']
})
export class ConfirmComponent implements OnInit {

  parking: any;  // Variável para armazenar os dados do estacionamento
  clienteName: string = '';  // Nome do cliente
  reservaTime: string = '';  // Horário da reserva

  constructor(private router: Router) {
    // Obtendo os dados do estacionamento e do cliente da navegação anterior
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as {
      selectedParking: any;
      clienteName: string;
      reservaTime: string;
    };

    // Armazenando os dados recebidos
    if (state) {
      this.parking = state.selectedParking;
      this.clienteName = state.clienteName;
      this.reservaTime = state.reservaTime;
    }
  }

  ngOnInit(): void {}

  confirmReservation() {
    // Aqui você pode implementar a lógica para confirmar a reserva
    console.log('Reserva Confirmada:');
    console.log('Estacionamento:', this.parking);
    console.log('Cliente:', this.clienteName);
    console.log('Horário:', this.reservaTime);

    // Redirecionar ou exibir uma mensagem de confirmação
    alert('Reserva confirmada com sucesso!');
  }
}
