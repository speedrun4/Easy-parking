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
    let estacionamentos = this.getEstacionamentos();
    estacionamentos.push(estacionamento);
    localStorage.setItem('estacionamentos', JSON.stringify(estacionamentos));
  }
  getEstacionamentos(): any[] {
    return JSON.parse(localStorage.getItem('estacionamentos') || '[]');
  }
}
