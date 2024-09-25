import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EstacionamentoService {

  private estacionamentosSubject = new BehaviorSubject<any[]>([]);
  estacionamentos$ = this.estacionamentosSubject.asObservable();

  private estacionamentos: any[] = [];

  constructor() { }

  adicionarEstacionamento(estacionamento: any) {
    this.estacionamentos.push(estacionamento);
    this.estacionamentosSubject.next(this.estacionamentos);  // Atualiza a lista de estacionamentos
  }
}
