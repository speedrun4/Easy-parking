import { Component, OnInit } from '@angular/core';
import { Carteira } from 'src/app/models/carteira.model';
import { CarteiraService } from 'src/app/services/carteira.service';

@Component({
  selector: 'app-carteira',
  templateUrl: './carteira.component.html',
  styleUrls: ['./carteira.component.scss']
})
export class CarteiraComponent implements OnInit {

  carteira: Carteira = { saldo: 0, historicoTransacoes: [] };
  valorOperacao: number = 0;
  descricaoOperacao: string = '';

  constructor(private carteiraService: CarteiraService) { }

  ngOnInit(): void {
    this.carteira = this.carteiraService.obterCarteira();
  }

  adicionar() {
    this.carteiraService.adicionarValor(this.valorOperacao, this.descricaoOperacao);
    this.valorOperacao = 0;
    this.descricaoOperacao = '';
  }

  remover() {
    this.carteiraService.removerValor(this.valorOperacao, this.descricaoOperacao);
    this.valorOperacao = 0;
    this.descricaoOperacao = '';
  }

}
