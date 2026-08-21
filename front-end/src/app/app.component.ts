import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';
import { PreReservationService } from './services/pre-reservation.service';
import { ParkingExpirationAlertService } from './services/parking-expiration-alert.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  isSplashScreenActive = true; // Inicialmente, a tela de splash está ativa
  private preReservaExpiredSub?: Subscription;
  private isShowingPreReservaExpiredModal = false;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private preReservaService: PreReservationService,
    private parkingExpirationAlertService: ParkingExpirationAlertService
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Oculta o header tanto na rota inicial quanto na splash
        this.isSplashScreenActive = this.router.url === '/splash' || this.router.url === '/' || this.router.url === '';
      }
    });
  }

  ngOnInit(): void {
    this.preReservaService.startExpirationWatcher();
    this.preReservaService.checkAndExpireIfNeeded();
    this.parkingExpirationAlertService.start();

    this.preReservaExpiredSub = this.preReservaService.preReservaExpired$.subscribe(() => {
      if (this.isShowingPreReservaExpiredModal) {
        return;
      }

      this.isShowingPreReservaExpiredModal = true;
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        width: '400px',
        disableClose: true,
        data: {
          title: 'Pré-reserva expirada',
          message: 'Tempo esgotado! Sua pré-reserva foi cancelada.',
          singleAction: true,
          confirmText: 'OK'
        }
      });

      dialogRef.afterClosed().subscribe(() => {
        this.isShowingPreReservaExpiredModal = false;
        this.router.navigate(['/welcome']);
      });
    });
  }

  ngOnDestroy(): void {
    this.preReservaExpiredSub?.unsubscribe();
    this.preReservaService.stopExpirationWatcher();
  }
}
