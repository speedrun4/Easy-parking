// ...existing code...
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EstacionamentoService {

  getEstacionamentoPorUsuarioId(usuarioId: number) {
    return this.http.get<any>(`${this.apiUrl}/usuario/${usuarioId}`);
  }

  private estacionamentosSubject = new BehaviorSubject<any[]>([]);
  estacionamentos$ = this.estacionamentosSubject.asObservable();
 private geoapifyApiKey = 'ace82b241e56461bba40b0cfac707318';


  private apiUrl = 'http://localhost:8080/api/clientes'; // URL da API

  constructor(private http: HttpClient) { }

  fetchEstacionamentos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      mergeMap((clientes) => {
        const requests = clientes.map((cliente) => this.getCoordinatesByCep(cliente.cep).pipe(
          map((coords) => {
            console.log('DEBUG horarioAbertura:', cliente.nomeEmpresa, cliente.horarioAbertura, cliente.horarioFechamento);
            return {
              id: cliente.id,
              latitude: coords.latitude,
              longitude: coords.longitude,
              companyName: cliente.nomeEmpresa,
              hourlyRate: cliente.valorPorHora,
              address: cliente.enderecoCompleto,
              horarioAbertura: cliente.horarioAbertura,
              horarioFechamento: cliente.horarioFechamento
            };
          })
        ));
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
  getAddressByCep(cep: string): Observable<any> {
  const url = `https://viacep.com.br/ws/${cep}/json/`;
  return this.http.get<any>(url);
}

getCoordinatesByAddress(address: string): Observable<any> {
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${this.geoapifyApiKey}`;
  return this.http.get<any>(url).pipe(
    map((response) => {
      if (response.features.length > 0) {
        const { lat, lon } = response.features[0].properties;
        return { latitude: lat, longitude: lon };
      } else {
        throw new Error(`Geocode error for address: ${address}. Nenhum resultado encontrado.`);
      }
    })
  );
}

  // Exemplo de geração de coordenadas aleatórias (pode ser ajustado com coordenadas reais)
getCoordinatesByCep(cep: string): Observable<any> {
  return this.getAddressByCep(cep).pipe(
    mergeMap((addressData) => {
      const fullAddress = `${addressData.logradouro}, ${addressData.bairro}, ${addressData.localidade}, ${addressData.uf}, Brasil`;
      return this.getCoordinatesByAddress(fullAddress);
    })
  );
}

  salvarEstacionamento(estacionamento: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, estacionamento);
  }
}
