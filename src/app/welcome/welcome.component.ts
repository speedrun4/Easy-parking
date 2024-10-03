import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EstacionamentoService } from '../services/estacionamento.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss'],
})
export class WelcomeComponent implements OnInit {
  searchForm: FormGroup;
  latitude = -23.55052;
  longitude = -46.633308;
  zoom = 12;
  markers: any[] = [];
  filteredMarkers: any[] = []; // Armazena os resultados da busca
  selectedParking: any; // Variável para armazenar o estacionamento selecionado

  constructor(
    private fb: FormBuilder,
    private estacionamentoService: EstacionamentoService,
    private router: Router
  ) {
    // Inicializando o formulário de busca
    this.searchForm = this.fb.group({
      search: [''],
    });
  }

  ngOnInit(): void {
    // Carregando os estacionamentos e criando os marcadores para o mapa
    this.estacionamentoService.estacionamentos$.subscribe((estacionamentos) => {
      this.markers = estacionamentos.map((estacionamento) => ({
        latitude: estacionamento.latitude,
        longitude: estacionamento.longitude,
        label: `R$ ${estacionamento.hourlyRate}/h`,
        title: estacionamento.companyName,
        address: estacionamento.address, // Adicionando endereço para busca
        iconUrl:
          'https://maps.google.com/mapfiles/kml/shapes/parking_lot_maps.png',
      }));

      // No início, mostramos todos os estacionamentos
      this.filteredMarkers = this.markers;
    });
  }

  // Função de busca
  onSearch() {
    const query = this.searchForm.get('search')?.value?.toLowerCase();

    // Filtra os estacionamentos pelo nome ou endereço
    if (query) {
      this.filteredMarkers = this.markers.filter(
        (marker) =>
          marker.title.toLowerCase().includes(query) ||
          marker.address.toLowerCase().includes(query)
      );

      if (this.filteredMarkers.length > 0) {
        // Centraliza o mapa no primeiro resultado encontrado
        this.latitude = this.filteredMarkers[0].latitude;
        this.longitude = this.filteredMarkers[0].longitude;
        this.zoom = 14; // Ajusta o zoom para um nível mais próximo
      }
    } else {
      // Se a busca estiver vazia, mostra todos os estacionamentos
      this.filteredMarkers = this.markers;
    }

    console.log('Pesquisa:', query, this.filteredMarkers);
  }

  // Função para confirmar a seleção de um estacionamento
  confirmSelection() {
    if (this.filteredMarkers.length > 0) {
      this.selectedParking = this.filteredMarkers[0];

      // Exemplo de nome de cliente e horário de reserva (você pode obter esses dados de um formulário ou serviço)
      const clienteName = 'João Silva'; // Substitua com o nome do cliente real
      const reservaTime = '15:00'; // Substitua com o horário da reserva real

      // Redireciona para a página de confirmação com o estacionamento selecionado e informações adicionais
      this.router.navigate(['/confirm'], {
        state: {
          selectedParking: this.selectedParking,
          clienteName: clienteName,
          reservaTime: reservaTime,
        },
      });
    }
  }
}
