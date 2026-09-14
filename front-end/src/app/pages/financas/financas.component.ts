import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { PaymentHistoryService } from 'src/app/services/payment-history.service';
import { AuthService } from 'src/app/services/auth.service';

interface Financa {
  descricao: string;
  valor: number;
  dataPagamento: Date;
  status: string;
  estacionamento?: string;
}

@Component({
  selector: 'app-financas',
  templateUrl: './financas.component.html',
  styleUrls: ['./financas.component.scss']
})
export class FinancasComponent implements OnInit {

  displayedColumns: string[] = ['descricao', 'valor', 'dataPagamento', 'status'];
  dataSource = new MatTableDataSource<Financa>([]);

  @ViewChild(MatPaginator)
  paginator!: MatPaginator;

  constructor(
    private paymentHistoryService: PaymentHistoryService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      // Usuário não autenticado, não busca dados
      this.dataSource.data = [];
      return;
    }
    this.paymentHistoryService.getPaymentHistory(currentUser.id).subscribe({
      next: (pagamentos: any[]) => {
        // Considera apenas pagamentos efetivamente concluídos, evitando exibir
        // cobranças PIX abandonadas/pendentes (status "aguardando_pagamento") como se fossem pagas
        const pagos = (pagamentos || []).filter(p => (p.status || '').toLowerCase() === 'pago');
        // Mapeia os dados do backend para o formato da tabela
        this.dataSource.data = pagos.map(p => ({
          descricao: p.estacionamento || p.nome || 'Pagamento',
          valor: p.valorPago,
          dataPagamento: p.data || p.dataPagamento,
          status: 'Pago',
          estacionamento: p.estacionamento
        }));
        this.dataSource.paginator = this.paginator;
      },
      error: () => {
        this.dataSource.data = [];
      }
    });
  }

}
