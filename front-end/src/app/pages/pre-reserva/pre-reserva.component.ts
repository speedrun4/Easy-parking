import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AlertDialogCancelComponent } from 'src/app/components/alert-dialog-cancel/alert-dialog-cancel.component';
import { PreReservationService } from 'src/app/services/pre-reservation.service';

@Component({
  selector: 'app-pre-reserva',
  templateUrl: './pre-reserva.component.html',
  styleUrls: ['./pre-reserva.component.scss']
})
export class PreReservaComponent implements OnInit {
  showSaidaError = false;
  preReservaData: any = null;
  countdown: string = '';
  timer: any;
  selectedParkings: any[] = [];
  constructor(private router: Router, private preReservaService: PreReservationService, private dialog: MatDialog) { }

  ngOnInit(): void {
    // Carregar os dados do localStorage
    const storedData = localStorage.getItem('preReservaData');

    if (storedData) {
      this.preReservaData = JSON.parse(storedData);
      this.updateCountdown();
      this.startCountdown();
    } else {
      // Redirecionar se não houver dados
      this.router.navigate(['/']);
    }
  }

  startCountdown() {
    this.timer = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  updateCountdown() {
    if (!this.preReservaData) return;
    const expirationTime = this.preReservaData.timestamp + 10 * 60 * 1000;
    const now = Date.now();
    const timeLeft = expirationTime - now;

    if (timeLeft <= 0) {
      this.clearPreReserva();
    } else {
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      this.countdown = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
    }
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
  
  cancelPayment() {
      localStorage.removeItem('paymentData');
      localStorage.removeItem('preReservaData');
      this.preReservaService.notifyPreReservaCancelled();
      const dialogRef = this.dialog.open(AlertDialogCancelComponent, {
        width: '350px',
        data: {
          title: 'Pagamento Cancelado',
          message: 'Seu pagamento foi cancelado. Você foi redirecionado para a página de estacionamentos'
        }
      });
      dialogRef.afterClosed().subscribe(() => {
        this.router.navigate(['/welcome'], {
          state: { paymentCancelled: true }
        });
      });
      this.router.navigate(['/welcome'], {
        state: {
          paymentCancelled: true
        }
      });
    }
  proceedToPayment() {
    if (this.preReservaData && this.preReservaData.selectedParkings.length > 0) {
      // Validação: todos os estacionamentos precisam ter horário de saída preenchido
      const algumSemSaida = this.preReservaData.selectedParkings.some((p: any) => !p.selectedHoraSaida);
      if (algumSemSaida) {
        this.showSaidaError = true;
        setTimeout(() => this.showSaidaError = false, 3000);
        return;
      }
      // Soma o total de todos os estacionamentos selecionados
      const totalValue = this.preReservaData.selectedParkings
        .map((p: any) => p.total || 0)
        .reduce((acc: number, val: number) => acc + val, 0);

      // Adiciona data e horários de reserva em cada estacionamento
      const selectedParkings = this.preReservaData.selectedParkings.map((p: any) => ({
  ...p,
  data: p.selectedDate || this.preReservaData.selectedDate || null,
  horaEntrada: p.selectedTime || this.preReservaData.selectedTime || null,
  horaSaida: p.selectedExitTime || p.selectedHoraSaida || null // cobre ambos os casos
      }));

      const paymentData = {
        selectedParkings,
        clienteName: this.preReservaData.clienteName,
        timestamp: new Date().getTime(),
        totalValue
      };
      localStorage.setItem('paymentData', JSON.stringify(paymentData));
      this.router.navigate(['/payment']);
    } else {
      alert('Nenhuma reserva encontrada para pagamento.');
    }
  }
}
