import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';

@Component({
  selector: 'app-route',
  templateUrl: './route.component.html',
  styleUrls: ['./route.component.scss']
})
export class RouteComponent implements OnInit {
  destination: any;
  distance: string = '';
  duration: string = '';
  map!: L.Map;

  constructor(private router: Router) {
    const state = this.router.getCurrentNavigation()?.extras.state as {
      destination: { lat: number; lon: number; title: string; address: string; phone?: string; cep?: string; }
    };
    this.destination = state?.destination;
  }

  ngOnInit(): void {
    console.log('Destination recebido:', this.destination);
  if (
    this.destination &&
    typeof this.destination.lat === 'number' &&
    typeof this.destination.lon === 'number'
  ) {
    this.initMap();
  } else {
    alert('Dados de rota não encontrados ou incompletos.');
    this.router.navigate(['/']);
  }
  }

  initMap() {
    this.map = L.map('map').setView([this.destination.lat, this.destination.lon], 16);

    L.tileLayer('https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=ace82b241e56461bba40b0cfac707318', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    // Ícone SVG igual ao do welcome.component.ts
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

    // Adiciona marcador do estacionamento
    L.marker([this.destination.lat, this.destination.lon], { icon: parkingIcon })
      .addTo(this.map)
      .bindPopup(`<b>${this.destination.title}</b><br>${this.destination.address}`)
      .openPopup();

    // Se quiser calcular distância do usuário, use geolocalização:
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;
        // Chame a API de rota Geoapify para calcular distância e tempo
        fetch(`https://api.geoapify.com/v1/routing?waypoints=${userLat},${userLon}|${this.destination.lat},${this.destination.lon}&mode=drive&apiKey=ace82b241e56461bba40b0cfac707318`)
          .then(res => res.json())
          .then(result => {
            if (result.features && result.features[0]) {
              const props = result.features[0].properties;
              this.distance = (props.distance / 1000).toFixed(2) + ' km';
              this.duration = Math.round(props.time / 60) + ' min';
            }
          });
      });
    }
  }

  openDirections() {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${this.destination.lat},${this.destination.lon}`, '_blank');
  }
}
