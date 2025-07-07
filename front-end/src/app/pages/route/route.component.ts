import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';


@Component({
  selector: 'app-route',
  templateUrl: './route.component.html',
  styleUrls: ['./route.component.scss']
})
export class RouteComponent implements OnInit {
  origin: any;
  destination: any;

  constructor(private router: Router) {
    const state = this.router.getCurrentNavigation()?.extras.state as {
      origin: { lat: number; lon: number },
      destination: { lat: number; lon: number }
    };

    this.origin = state?.origin;
    this.destination = state?.destination;
  }

  ngOnInit(): void {
    if (this.origin && this.destination) {
      this.initMap();
    } else {
      alert('Dados de rota não encontrados.');
      this.router.navigate(['/']);
    }
  }

  initMap() {
    const DefaultIcon = L.icon({
      iconUrl: '/assets/leaflet/marker-icon.png',
      shadowUrl: '/assets/leaflet/marker-shadow.png',
      iconRetinaUrl: '/assets/leaflet/marker-icon-2x.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    L.Marker.prototype.options.icon = DefaultIcon;
    const map = L.map('map').setView([this.origin.lat, this.origin.lon], 14);

    L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=ace82b241e56461bba40b0cfac707318`, {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Add markers
    L.marker([this.origin.lat, this.origin.lon]).addTo(map).bindPopup('Você');
    L.marker([this.destination.lat, this.destination.lon]).addTo(map).bindPopup('Estacionamento');

    // Get route
    fetch(`https://api.geoapify.com/v1/routing?waypoints=${this.origin.lat},${this.origin.lon}|${this.destination.lat},${this.destination.lon}&mode=drive&apiKey=YOUR_API_KEY`)
      .then(res => res.json())
      .then(result => {
        const coords = result.features[0].geometry.coordinates.map((coord: any) => [coord[1], coord[0]]);
        const duration = result.features[0].properties.time;
        L.polyline(coords, { color: 'blue', weight: 5 }).addTo(map);
        L.popup()
          .setLatLng([this.destination.lat, this.destination.lon])
          .setContent(`Tempo estimado de chegada: ${(duration / 60).toFixed(0)} minutos`)
          .openOn(map);
      })
      .catch(error => {
        console.error('Erro ao obter rota:', error);
      });
  }
}
