import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EstacionamentoService } from '../../services/estacionamento.service';
import { Router } from '@angular/router';
import * as L from 'leaflet';

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
  filteredMarkers: any[] = [];
  selectedParkings: any[] = [];
  paymentConfirmed: boolean = false;
  selectedTime: string | undefined;

  private map!: L.Map;
  private leafletMarkers: L.Marker[] = [];

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
    this.estacionamentoService.carregarEstacionamentos();

    this.estacionamentoService.estacionamentos$.subscribe((data) => {
      this.filteredMarkers = data.map(est => ({
        title: est.companyName,
        label: `R$${est.hourlyRate}/h`,
        address: est.address,
        latitude: est.latitude,
        longitude: est.longitude
      }));

      if (this.filteredMarkers.length > 0) {
        const first = this.filteredMarkers[0];
        this.initMap(first.latitude, first.longitude);  // ⬅️ Inicializa já centralizado no estacionamento
      } else {
        this.initMap(-23.55052, -46.633308); // fallback São Paulo, caso não tenha nenhum estacionamento
      }

      this.updateMapMarkers();
    });
  }

  initMap(lat: number, lng: number): void {
    if (this.map) {
      this.map.remove();
    }
    this.map = L.map('map').setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);
  }

  private updateMapMarkers() {
    if (!this.map) return;

    const parkingIcon = L.icon({
      iconUrl: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
    <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="28" fill="#2ecc71" stroke="white" stroke-width="4"/>
      <text x="30" y="40" font-size="30" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">P</text>
    </svg>
  `),
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    // Remove marcadores antigos
    this.leafletMarkers.forEach(marker => marker.remove());
    this.leafletMarkers = [];

    // Adiciona novos marcadores
    this.filteredMarkers.forEach(marker => {
      const leafletMarker = L.marker([marker.latitude, marker.longitude], { icon: parkingIcon })
        .addTo(this.map)
        .bindPopup(
          `<b>${marker.title}</b><br>${marker.label}<br>${marker.address}<br><i style="color:red;">Preencha os dados abaixo!</i>`
        );
      leafletMarker.on('click', () => {
        this.toggleParkingSelection(marker);
      });

      this.leafletMarkers.push(leafletMarker);
    });

    // Ajusta o centro do mapa se houver marcadores filtrados
    if (this.filteredMarkers.length > 0) {
      const first = this.filteredMarkers[0];
      this.map.setView([first.latitude, first.longitude], this.zoom);
    }
  }

  areDatesAndTimesSelected(): boolean {
    return this.selectedParkings.every(parking => parking.selectedDate && parking.selectedTime);
  }

  askForRoute() {
    const startRoute = confirm(
      'Pagamento confirmado! Deseja iniciar a rota até o estacionamento agora?'
    );

  }



  // Função de busca
  onSearch() {
    const query = this.searchForm.get('search')?.value?.trim().toLowerCase();

    if (!query) {
      this.estacionamentoService.fetchEstacionamentos().subscribe(estacionamentos => {
        this.markers = estacionamentos.map((estacionamento: any) => ({
          latitude: estacionamento.latitude,
          longitude: estacionamento.longitude,
          label: `R$ ${estacionamento.hourlyRate}/h`,
          title: estacionamento.companyName,
          address: estacionamento.address,
          // iconUrl: 'https://maps.google.com/mapfiles/kml/shapes/parking_lot_maps.png',
        }));

        this.filteredMarkers = [...this.markers];

        if (this.filteredMarkers.length > 0) {
          this.latitude = this.filteredMarkers[0].latitude;
          this.longitude = this.filteredMarkers[0].longitude;
          this.zoom = 15;
        }
        this.updateMapMarkers();
      });
      return;
    }

    const cepRegex = /^\d{5}-?\d{3}$/;
    const isCep = cepRegex.test(query.replace(/\D/g, ''));

    this.estacionamentoService.fetchEstacionamentos().subscribe(estacionamentos => {
      const filtrados = estacionamentos.filter((e: any) => {
        const cep = (e.address || '').replace(/\D/g, '');
        const nome = this.normalizeText(e.companyName);
        const endereco = this.normalizeText(e.address);
        const cidade = this.normalizeText(e.city);
        const bairro = this.normalizeText(e.neighborhood);

        if (isCep) {
          const queryCep = query.replace(/\D/g, '');
          return cep === queryCep;
        }

        return (
          nome.includes(query) ||
          endereco.includes(query) ||
          cidade.includes(query) ||
          bairro.includes(query)
        );
      });

      this.markers = filtrados.map((estacionamento: any) => ({
        latitude: estacionamento.latitude,
        longitude: estacionamento.longitude,
        label: `R$ ${estacionamento.hourlyRate}/h`,
        title: estacionamento.companyName,
        address: estacionamento.address,
        iconUrl: 'https://maps.google.com/mapfiles/kml/shapes/parking_lot_maps.png',
      }));

      this.filteredMarkers = [...this.markers];

      if (this.filteredMarkers.length > 0) {
        this.latitude = this.filteredMarkers[0].latitude;
        this.longitude = this.filteredMarkers[0].longitude;
        this.zoom = 15;
      }
      this.updateMapMarkers();
    });
  }

  normalizeText(text: string): string {
    return (text || '')
      .normalize('NFD') // Remove acentos
      .replace(/[\u0300-\u036f]/g, '') // Regex para remover diacríticos
      .toLowerCase();
  }

  removeParking(markerToRemove: any) {
    const index = this.selectedParkings.findIndex(
      (marker) =>
        marker.latitude === markerToRemove.latitude &&
        marker.longitude === markerToRemove.longitude
    );

    if (index !== -1) {
      this.selectedParkings.splice(index, 1);
    }
  }

  toggleParkingSelection(marker: any) {
    const index = this.selectedParkings.findIndex(
      (selectedMarker) =>
        selectedMarker.latitude === marker.latitude &&
        selectedMarker.longitude === marker.longitude
    );

    if (index === -1) {
      this.selectedParkings.push({
        ...marker,
        selectedDate: '',
        selectedTime: '',
      });
    } else {
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
    this.updateMapMarkers();
  }

  updateSelectedParkingDate(marker: any, date: Date) {
  const formattedDate = this.formatDate(date);
  const parking = this.selectedParkings.find(
    (selectedMarker) =>
      selectedMarker.latitude === marker.latitude &&
      selectedMarker.longitude === marker.longitude
  );
  if (parking) {
    parking.selectedDate = formattedDate;
  }
}

formatDate(date: Date): string {
  const day = ('0' + date.getDate()).slice(-2);
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

  updateSelectedParkingTime(marker: any, event: Event) {
    const inputElement = event.target as HTMLInputElement;
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

  confirmSelection() {
    if (this.selectedParkings.length > 0) {
      const clienteName = 'João Silva';

      this.router.navigate(['/confirm'], {
        state: {
          selectedParkings: this.selectedParkings.map((parking) => ({
            title: parking.title,
            label: parking.label,
            address: parking.address,
            selectedDate: parking.selectedDate,
            selectedTime: parking.selectedTime,
          })),
          clienteName: clienteName,
        },
      });

      console.log('Estacionamentos confirmados:', this.selectedParkings);
    }
  }
}
