import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EstacionamentoService {

  private estacionamentosSubject = new BehaviorSubject<any[]>([]);
  estacionamentos$ = this.estacionamentosSubject.asObservable();
  private googleGeocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json'; // URL da API de geocodificação
  private apiKey = 'AIzaSyC1JY-mIJMlZinIwKj3jJYoCV9sXrpWmSk'; // Substitua pela sua chave de API do Google Maps


  private apiUrl = 'http://localhost:8080/api/clientes'; // URL da API

  constructor(private http: HttpClient) { }

  fetchEstacionamentos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      mergeMap((clientes) => {
        const requests = clientes.map((cliente) => this.getCoordinatesByCep(cliente.cep).pipe(
          map((coords) => {
            console.log('Nome da Empresa:', cliente.nomeEmpresa); // Verifique o nome da empresa
            return {
              latitude: coords.latitude,
              longitude: coords.longitude,
              companyName: cliente.nomeEmpresa,
              hourlyRate: cliente.valorPorHora,
              address: cliente.enderecoCompleto,
            };
          })
        ));

        // Executa todas as requisições de geocodificação de uma vez com forkJoin
        return forkJoin(requests);
      })
    );
  }
  // Método para carregar os dados no BehaviorSubject
  carregarEstacionamentos() {
    this.fetchEstacionamentos().subscribe((estacionamentos) => {
      this.estacionamentosSubject.next(estacionamentos);
    });
  }

  // Exemplo de geração de coordenadas aleatórias (pode ser ajustado com coordenadas reais)
  getCoordinatesByCep(cep: string): Observable<any> {
    const cleanedCep = cep.replace(/\D/g, ''); // Limpa o CEP
    const url = `${this.googleGeocodeUrl}?address=${cleanedCep}&key=${this.apiKey}`;

    return this.http.get(url).pipe(
      map((response: any) => {
        if (response.status === 'OK' && response.results.length > 0) {
          const location = response.results[0].geometry.location;
          return { latitude: location.lat, longitude: location.lng };
        } else {
          throw new Error(`Geocode error for CEP: ${cep}. Status: ${response.status}`);
        }
      })
    );
  }

  salvarEstacionamento(estacionamento: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, estacionamento);
  }
}
