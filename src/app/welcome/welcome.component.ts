import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

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

  constructor(private fb: FormBuilder) {
    this.searchForm = this.fb.group({
      search: ['']
    });
  }

  ngOnInit(): void {
    this.loadMapMarkers();
  }

  loadMapMarkers() {
    // Aqui você deve adicionar a lógica para buscar estacionamentos e configurar os marcadores
    this.markers = [
      {
        latitude: -23.55052,
        longitude: -46.633308,
        label: 'R$ 10/h',
        title: 'Estacionamento A'
      }
      // Adicione mais marcadores conforme necessário
    ];
  }

  onSearch() {
    const query = this.searchForm.get('search')?.value;
    // Adicione a lógica para buscar estacionamentos com base na pesquisa
    console.log('Pesquisa:', query);
  }

}
