import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EstacionamentoService } from '../../services/estacionamento.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pre-reserva',
  templateUrl: './pre-reserva.component.html',
  styleUrls: ['./pre-reserva.component.scss'],
})
export class PreReservaComponent implements OnInit {
  searchForm: FormGroup;
  latitude = -23.55052;
  longitude = -46.633308;
  zoom = 12;
  markers: any[] = [];
  filteredMarkers: any[] = []; // Armazena os resultados da busca
  selectedParkings: any[] = []; // Array para armazenar estacionamentos selecionados
  paymentConfirmed: boolean = false;
  selectedTime: string | undefined;

  constructor(
    private fb: FormBuilder,
    private estacionamentoService: EstacionamentoService,
    private router: Router
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as { paymentConfirmed: boolean };

    if (state) {
      this.paymentConfirmed = state.paymentConfirmed;
    }

    this.searchForm = this.fb.group({
      search: [''],
    });
  }

  ngOnInit(): void {
    if (this.paymentConfirmed) {
      this.askForRoute();
    }
    this.estacionamentoService.carregarEstacionamentos();
    
    this.estacionamentoService.estacionamentos$.subscribe((estacionamentos) => {
      this.markers = estacionamentos.map((estacionamento) => ({
        latitude: estacionamento.latitude,
        longitude: estacionamento.longitude,
        label: `R$ ${estacionamento.hourlyRate}/h`, // Valor por hora
        title: estacionamento.companyName, // Nome da empresa
        address: estacionamento.address, // Endereço
        iconUrl: 'https://maps.google.com/mapfiles/kml/shapes/parking_lot_maps.png',
      }));

      this.filteredMarkers = this.markers;
    });

    const estacionamentosSalvos = JSON.parse(
      localStorage.getItem('estacionamentos') || '[]'
    );
    if (estacionamentosSalvos.length > 0) {
      estacionamentosSalvos.forEach((estacionamento: any) => {
        const marcador = {
          latitude: estacionamento.latitude,
          longitude: estacionamento.longitude,
          label: `R$ ${estacionamento.hourlyRate}/h`,
          title: estacionamento.companyName,
          address: estacionamento.address,
          iconUrl:
            'https://maps.google.com/mapfiles/kml/shapes/parking_lot_maps.png',
        };
        this.markers.push(marcador);
        this.filteredMarkers.push(marcador);
      });

      const primeiroEstacionamento = estacionamentosSalvos[0];
      this.latitude = primeiroEstacionamento.latitude;
      this.longitude = primeiroEstacionamento.longitude;
      this.zoom = 12;
    }
  }
  areDatesAndTimesSelected(): boolean {
    return this.selectedParkings.every(parking => parking.selectedDate && parking.selectedTime);
  }

  askForRoute() {
    const startRoute = confirm(
      'Pagamento confirmado! Deseja iniciar a rota até o estacionamento agora?'
    );
    if (startRoute) {
      this.navigateToGoogleMaps();
    }
  }

  navigateToGoogleMaps() {
    // Latitude e longitude do local atual (exemplo fixo para simplificação)
    const currentLatitude = -23.55052;
    const currentLongitude = -46.633308;

    // Destino de exemplo, pode ser baseado no estacionamento selecionado
    const destinationLatitude = -23.5733;
    const destinationLongitude = -46.6417;

    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLatitude},${currentLongitude}&destination=${destinationLatitude},${destinationLongitude}`;
    window.open(url, '_blank');
  }
  // Função de busca
  onSearch() {
    const query = this.searchForm.get('search')?.value?.toLowerCase();

    if (query) {
      this.filteredMarkers = this.markers.filter(
        (marker) =>
          marker.title.toLowerCase().includes(query) ||
          marker.address.toLowerCase().includes(query)
      );

      if (this.filteredMarkers.length > 0) {
        this.latitude = this.filteredMarkers[0].latitude;
        this.longitude = this.filteredMarkers[0].longitude;
        this.zoom = 14;
      }
    } else {
      this.filteredMarkers = this.markers;
    }
  }

  removeParking(markerToRemove: any) {
    const index = this.selectedParkings.findIndex(
      (marker) =>
        marker.latitude === markerToRemove.latitude &&
        marker.longitude === markerToRemove.longitude
    );

    if (index !== -1) {
      this.selectedParkings.splice(index, 1); // Remove o estacionamento da seleção
    }
  }
  // Função para selecionar/desselecionar estacionamento ao clicar no ícone no mapa
  toggleParkingSelection(marker: any) {
    const index = this.selectedParkings.findIndex(
      (selectedMarker) =>
        selectedMarker.latitude === marker.latitude &&
        selectedMarker.longitude === marker.longitude
    );

    if (index === -1) {
      // Se não estiver selecionado, adiciona à lista com data e hora padrão
      this.selectedParkings.push({
        ...marker,
        selectedDate: '', // Campo para a data
        selectedTime: '', // Campo para a hora
      });
    } else {
      // Se já estiver selecionado, remove da lista
      this.selectedParkings.splice(index, 1);
    }
  }

  deleteParking(markerToDelete: any) {
    this.markers = this.markers.filter((marker) => marker !== markerToDelete);
    this.filteredMarkers = this.filteredMarkers.filter(
      (marker) => marker !== markerToDelete
    );
    let estacionamentosSalvos = JSON.parse(
      localStorage.getItem('estacionamentos') || '[]'
    );
    estacionamentosSalvos = estacionamentosSalvos.filter(
      (estacionamento: any) =>
        estacionamento.latitude !== markerToDelete.latitude &&
        estacionamento.longitude !== markerToDelete.longitude
    );
    localStorage.setItem(
      'estacionamentos',
      JSON.stringify(estacionamentosSalvos)
    );
  }

  updateSelectedParkingDate(marker: any, date: string) {
    const parking = this.selectedParkings.find(
      (selectedMarker) =>
        selectedMarker.latitude === marker.latitude &&
        selectedMarker.longitude === marker.longitude
    );
    if (parking) {
      parking.selectedDate = date;
    }
  }
  
  updateSelectedParkingTime(marker: any, event: Event) {
    const inputElement = event.target as HTMLInputElement; // Confirma que o alvo é um elemento de entrada
  const time = inputElement.value;
  const parking = this.selectedParkings.find(
    (selectedMarker) =>
      selectedMarker.latitude === marker.latitude &&
      selectedMarker.longitude === marker.longitude
  );
  if (parking) {
    parking.selectedTime = time;
  }
  }
  

  // Função para confirmar a seleção de estacionamentos
  confirmSelection() {
    if (this.selectedParkings.length > 0) {
      const clienteName = 'João Silva'; // Nome do cliente
  
      this.router.navigate(['/confirm'], {
        state: {
          selectedParkings: this.selectedParkings.map((parking) => ({
            title: parking.title,
            label: parking.label,
            address: parking.address,
            selectedDate: parking.selectedDate, // Inclui a data selecionada
            selectedTime: parking.selectedTime, // Inclui a hora selecionada
          })),
          clienteName: clienteName,
        },
      });
  
      // Exibe os dados confirmados no console
      console.log('Estacionamentos confirmados:', this.selectedParkings);
    }
  }
}
