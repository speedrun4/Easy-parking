import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

interface Financa {
  descricao: string;
  valor: number;
  dataPagamento: Date;
  status: string;
}

@Component({
  selector: 'app-financas',
  templateUrl: './financas.component.html',
  styleUrls: ['./financas.component.scss']
})
export class FinancasComponent implements OnInit {

  displayedColumns: string[] = ['descricao', 'valor', 'dataPagamento', 'status'];
  dataSource = new MatTableDataSource<Financa>([
    { descricao: 'Serviço A', valor: 500, dataPagamento: new Date('2024-01-15'), status: 'Pago' },
    { descricao: 'Produto B', valor: 250, dataPagamento: new Date('2024-02-10'), status: 'Pago' },
    { descricao: 'Serviço C', valor: 750, dataPagamento: new Date('2024-03-05'), status: 'Pendente' },
  ]);

  @ViewChild(MatPaginator)
  paginator!: MatPaginator;

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
  }

}
