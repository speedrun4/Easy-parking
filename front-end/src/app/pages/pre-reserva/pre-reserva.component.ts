import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pre-reserva',
  templateUrl: './pre-reserva.component.html',
  styleUrls: ['./pre-reserva.component.scss']
})
export class PreReservaComponent implements OnInit {

  preReservaData: any = null; // Dados da pré-reserva
  countdown: number = 10 * 60; // 10 minutos em segundos
  timer: any;
  selectedParkings: any[] = [];
  constructor(private router: Router) {}

  ngOnInit(): void {
    // Carregar os dados do localStorage
    const storedData = localStorage.getItem('preReservaData');

    if (storedData) {
      this.preReservaData = JSON.parse(storedData);
      const currentTime = new Date().getTime();
      const elapsedTime = (currentTime - this.preReservaData.timestamp) / 1000;

      if (elapsedTime >= 10 * 60) {
        // Se o tempo expirou
        this.clearPreReserva();
      } else {
        // Ajustar o countdown com o tempo restante
        this.countdown = 10 * 60 - Math.floor(elapsedTime);
        this.startCountdown();
      }
    } else {
      // Redirecionar se não houver dados
      this.router.navigate(['/']);
    }
  }

  startCountdown() {
    this.timer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.clearPreReserva();
      }
    }, 1000);
  }

  clearPreReserva() {
    clearInterval(this.timer);
    localStorage.removeItem('preReservaData'); // Remove do localStorage
    this.preReservaData = null; // Limpa os dados da tela
    alert('Tempo esgotado! Sua pré-reserva foi cancelada.');
    this.router.navigate(['/']); // Redireciona para a página inicial
  }

  toggleParkingSelection(parking: any) {
    const index = this.selectedParkings.indexOf(parking);
    if (index > -1) {
      this.selectedParkings.splice(index, 1); // Remove se já estiver selecionado
    } else {
      this.selectedParkings.push(parking); // Adiciona se não estiver selecionado
    }
  }

  proceedToPayment() {
    if (this.selectedParkings.length > 0) {
      const paymentData = {
        selectedParkings: this.selectedParkings,
        timestamp: new Date().getTime()
      };
      localStorage.setItem('paymentData', JSON.stringify(paymentData)); // Salva os dados para pagamento
      this.router.navigate(['/pagamento']); // Redireciona para pagamento
    } else {
      alert('Selecione pelo menos um estacionamento para prosseguir.');
    }
  }
}
