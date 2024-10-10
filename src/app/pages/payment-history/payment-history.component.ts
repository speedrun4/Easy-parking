import { Component, OnInit } from '@angular/core';
import { PaymentHistory } from 'src/app/models/payment-history.model';
import { PaymentHistoryService } from 'src/app/services/payment-history.service';

@Component({
  selector: 'app-payment-history',
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.scss']
})
export class PaymentHistoryComponent implements OnInit {
  paymentHistory: PaymentHistory[] = [];

  constructor(private paymentHistoryService: PaymentHistoryService) { }

  ngOnInit(): void {
    this.paymentHistoryService.getPaymentHistory().subscribe((data: PaymentHistory[]) => {
      this.paymentHistory = data;
    });
  }
}
