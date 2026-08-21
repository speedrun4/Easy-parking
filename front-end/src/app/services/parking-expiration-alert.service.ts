import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ParkingExpirationAlertService {
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
  }
}
