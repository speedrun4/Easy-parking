import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EstacionamentoService } from '../services/estacionamento.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {

  searchForm: FormGroup;
  latitude = -23.55052;
  longitude = -46.633308;
  zoom = 12;
  markers: any[] = [];

  constructor(private fb: FormBuilder, private estacionamentoService: EstacionamentoService) {
    this.searchForm = this.fb.group({
      search: ['']
    });
  }

  ngOnInit(): void {
    this.estacionamentoService.estacionamentos$.subscribe(estacionamentos => {
      this.markers = estacionamentos.map(estacionamento => ({
        latitude: estacionamento.latitude,  // Latitude do estacionamento
        longitude: estacionamento.longitude,  // Longitude do estacionamento
        label: `R$ ${estacionamento.hourlyRate}/h`,
        title: estacionamento.companyName,
        iconUrl: 'https://maps.google.com/mapfiles/kml/shapes/parking_lot_maps.png'  // Ícone de estacionamento
      }));
    });
  }

 onSearch() {
    const query = this.searchForm.get('search')?.value;
    // Adicione a lógica para buscar estacionamentos com base na pesquisa
    console.log('Pesquisa:', query);
  }

}
