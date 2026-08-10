import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { EstacionamentoService } from '../../services/estacionamento.service';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss'],
})
export class WelcomeComponent implements OnInit {
  private readonly advanceBookingHours = 24;
  private readonly advanceBookingDiscountRate = 0.05;
  private readonly firstReservationPromoCode = 'first-reservation-10';
  searchForm: FormGroup;
  latitude = -23.55052;
  longitude = -46.633308;
  zoom = 12;
  markers: any[] = [];
  filteredMarkers: any[] = [];
  selectedParkings: any[] = [];
  paymentConfirmed: boolean = false;
  promotionBannerMessage: string = '';
  currentPromotionCode: string = '';
  selectedTime: string | undefined;

  timeOptions: string[] = [];
  exitTimeOptions: { [key: string]: string[] } = {};

  filteredOptions!: Observable<any[]>;

  private map!: L.Map;
  private leafletMarkers: L.Marker[] = [];

  minDate: Date;
  maxDate: Date;

  constructor(
    private fb: FormBuilder,
    private estacionamentoService: EstacionamentoService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as { paymentConfirmed: boolean };

    if (state) {
      this.paymentConfirmed = state.paymentConfirmed;
    }

    this.searchForm = this.fb.group({
      search: [''],
    });

    // Define minDate como hoje e maxDate como dois meses à frente
    this.minDate = new Date();
    this.maxDate = new Date();
    this.maxDate.setMonth(this.maxDate.getMonth() + 2);
  }

  ngOnInit(): void {
    this.applyPromotionFromRoute();

    this.estacionamentoService.carregarEstacionamentos();

    this.estacionamentoService.estacionamentos$.subscribe((data) => {
      this.filteredMarkers = data.map(est => ({
        title: est.companyName,
        label: `R$${est.hourlyRate}/h`,
        hourlyRate: est.hourlyRate,
        dailyRate12h: est.dailyRate12h,
        address: est.address,
        latitude: est.latitude,
        longitude: est.longitude,
        horarioAbertura: est.horarioAbertura,
        horarioFechamento: est.horarioFechamento
      }));

      this.markers = [...this.filteredMarkers];

      if (this.filteredMarkers.length > 0) {
        const first = this.filteredMarkers[0];
        this.initMap(first.latitude, first.longitude);  // ⬅️ Inicializa já centralizado no estacionamento
      } else {
        this.initMap(-23.55052, -46.633308); // fallback São Paulo, caso não tenha nenhum estacionamento
      }

      this.updateMapMarkers();
    });

    this.timeOptions = this.generateTimeOptions();

    // Autocomplete: filtra opções conforme digita
    this.filteredOptions = this.searchForm.get('search')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterEstacionamentos(value || ''))
    );
  }

  private applyPromotionFromRoute(): void {
    const promoCode = this.route.snapshot.queryParamMap.get('promo');
    if (!this.isKnownPromoCode(promoCode)) {
      this.currentPromotionCode = '';
      this.promotionBannerMessage = '';
      return;
    }

    this.currentPromotionCode = promoCode || '';
    this.promotionBannerMessage = this.getPromotionBannerMessage(this.currentPromotionCode);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { promo: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private isKnownPromoCode(promoCode: string | null): boolean {
    return this.isAdvancePromoCode(promoCode) || this.isFirstReservationPromoCode(promoCode);
  }

  private isAdvancePromoCode(promoCode: string | null): boolean {
    return promoCode === 'advance-24h-5' || promoCode === 'advance-24h-15' || promoCode === 'advance-24h-20';
  }

  private isFirstReservationPromoCode(promoCode: string | null): boolean {
    return promoCode === this.firstReservationPromoCode;
  }

  private getPromotionBannerMessage(promoCode: string): string {
    if (this.isFirstReservationPromoCode(promoCode)) {
      return 'Promocao ativa: 10% OFF na primeira reserva, validado no pagamento para novos usuarios.';
    }

    return 'Promocao ativa: 5% OFF em reservas com no minimo 24h de antecedencia.';
  }

  private _filterEstacionamentos(value: any): any[] {
    // Se value for objeto (seleção), retorna lista vazia
    if (typeof value !== 'string') return [];
    const filterValue = value.toLowerCase();
    return this.markers.filter(option =>
      this.normalizeText(option.title).includes(filterValue) ||
      this.normalizeText(option.address).includes(filterValue)
    );
  }

  onOptionSelected(event: any) {
    const selected = event.option.value;
    // Se já estiver selecionado, não adiciona de novo
    const exists = this.selectedParkings.some(
      (m) => m.latitude === selected.latitude && m.longitude === selected.longitude
    );
    if (!exists) {
      this.selectedParkings.push({
        ...selected,
        useDaily12h: false,
        selectedDate: '',
        selectedTime: '',
        selectedExitTime: '',
      });
    }
    // Limpa o campo de busca
    this.searchForm.get('search')?.setValue('');
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

  generateTimeOptions(): string[] {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        options.push(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
        );
      }
    }
    return options;
  }

  getExitTimeOptions(marker: any): string[] {
    if (!marker || !marker.selectedTime) return [];
    const entryIndex = this.timeOptions.indexOf(marker.selectedTime);
    if (entryIndex === -1) return [];
    let horarioFechamento = marker.horarioFechamento || '23:55';
    // Filtra horários após a entrada e até o fechamento
    return this.timeOptions.slice(entryIndex + 1).filter(time => time <= horarioFechamento);
  }

  getEntryTimeOptions(marker: any): string[] {
    if (!marker || !marker.selectedDate) return this.timeOptions;

    // Formato esperado: dd/MM/yyyy
    const [day, month, year] = marker.selectedDate.split('/').map(Number);
    const today = new Date();
    const isToday =
      day === today.getDate() &&
      month === today.getMonth() + 1 &&
      year === today.getFullYear();

    let horarioAbertura = marker.horarioAbertura || '00:00';
    let horarioFechamento = marker.horarioFechamento || '23:55';

    // Se for hoje, o mínimo é o maior entre agora e o horário de abertura
    let minTime = horarioAbertura;
    if (isToday) {
      const now = new Date();
      let hour = now.getHours();
      let minute = now.getMinutes();
      minute = Math.ceil(minute / 5) * 5;
      if (minute === 60) {
        hour += 1;
        minute = 0;
      }
      const nowTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      if (nowTime > horarioAbertura) {
        minTime = nowTime;
      }
    }

    // Filtra horários entre abertura e fechamento
    return this.timeOptions.filter((time) => time >= minTime && time <= horarioFechamento);
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
    return this.selectedParkings.every(parking =>
      parking.selectedDate &&
      parking.selectedTime &&
      (parking.useDaily12h || parking.selectedExitTime)
      );
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
          hourlyRate: estacionamento.hourlyRate,
          dailyRate12h: estacionamento.dailyRate12h,
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
        hourlyRate: estacionamento.hourlyRate,
        dailyRate12h: estacionamento.dailyRate12h,
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
        useDaily12h: false,
        selectedDate: '',
        selectedTime: '',
        selectedExitTime: '',
      });
    } else {
      this.selectedParkings.splice(index, 1);
    }
  }

  updateSelectedParkingTime(marker: any, event: any) {
    const time = event.value;
    const parking = this.selectedParkings.find(
      (selectedMarker) =>
        selectedMarker.latitude === marker.latitude &&
        selectedMarker.longitude === marker.longitude
    );
    if (parking) {
      parking.selectedTime = time;
      if (parking.useDaily12h && !this.canUseDaily12h(parking)) {
        parking.useDaily12h = false;
      }
      if (parking.useDaily12h) {
        parking.selectedExitTime = this.calculateExitTime12h(time);
      } else {
        parking.selectedExitTime = ''; // Limpa saída ao mudar entrada
      }
    }
  }

  updateSelectedParkingExitTime(marker: any, event: any) {
    const time = event.value;
    const parking = this.selectedParkings.find(
      (selectedMarker) =>
        selectedMarker.latitude === marker.latitude &&
        selectedMarker.longitude === marker.longitude
    );
    if (parking) {
      parking.selectedExitTime = time;
    }
  }

  updatePricingMode(marker: any, useDaily12h: boolean) {
    const parking = this.selectedParkings.find(
      (selectedMarker) =>
        selectedMarker.latitude === marker.latitude &&
        selectedMarker.longitude === marker.longitude
    );
    if (!parking) {
      return;
    }

    if (useDaily12h && !this.canUseDaily12h(parking)) {
      parking.useDaily12h = false;
      parking.selectedExitTime = '';
      return;
    }

    parking.useDaily12h = useDaily12h;
    if (useDaily12h && parking.selectedTime) {
      parking.selectedExitTime = this.calculateExitTime12h(parking.selectedTime);
    }
  }

  canUseDaily12h(marker: any): boolean {
    if (!marker?.dailyRate12h || !marker?.selectedTime) {
      return false;
    }

    const entryMinutes = this.timeToMinutes(marker.selectedTime);
    const closeMinutes = this.timeToMinutes(marker.horarioFechamento || '23:55');
    if (entryMinutes === null || closeMinutes === null) {
      return false;
    }

    const exitMinutes = entryMinutes + (12 * 60);
    return exitMinutes <= closeMinutes;
  }

  private timeToMinutes(time: string): number | null {
    if (!time || !time.includes(':')) {
      return null;
    }
    const [hour, minute] = time.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return null;
    }
    return hour * 60 + minute;
  }

  private calculateExitTime12h(entryTime: string): string {
    if (!entryTime) return '';
    const [hour, minute] = entryTime.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return '';
    const totalMinutes = ((hour * 60 + minute + 12 * 60) % (24 * 60));
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
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
    parking.selectedTime = '';
    parking.selectedExitTime = '';
  }
}

formatDate(date: Date): string {
  const day = ('0' + date.getDate()).slice(-2);
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

  isAdvanceBookingEligible(marker: any): boolean {
    const reservationDateTime = this.getReservationDateTime(marker?.selectedDate, marker?.selectedTime);
    if (!reservationDateTime) {
      return false;
    }

    const now = new Date();
    const diffHours = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours >= this.advanceBookingHours;
  }

  getAdvanceBookingDiscount(marker: any): number {
    const baseTotal = this.calculateBaseTotal(marker);
    if (!baseTotal || !this.isAdvanceBookingEligible(marker)) {
      return 0;
    }
    return Math.round(baseTotal * this.advanceBookingDiscountRate * 100) / 100;
  }

  calculateTotal(marker: any): number {
  const baseTotal = this.calculateBaseTotal(marker);
  if (!baseTotal) {
    return 0;
  }

  const discount = this.getAdvanceBookingDiscount(marker);
  const totalWithDiscount = baseTotal - discount;
  return Math.round(totalWithDiscount * 100) / 100;
}

  private calculateBaseTotal(marker: any): number {
  if (!marker?.selectedTime) return 0;

  if (marker.useDaily12h) {
    const dailyRate = Number(marker.dailyRate12h || 0);
    return Math.ceil(dailyRate * 100) / 100;
  }

  if (!marker.selectedExitTime) return 0;

  const [startHour, startMinute] = marker.selectedTime.split(':').map(Number);
  const [endHour, endMinute] = marker.selectedExitTime.split(':').map(Number);

  const start = new Date();
  start.setHours(startHour, startMinute, 0);

  const end = new Date();
  end.setHours(endHour, endMinute, 0);

  let diffMs = end.getTime() - start.getTime();

  if (diffMs <= 0) {
    // Se a hora de saída for menor ou igual à entrada, assume que é no dia seguinte.
    diffMs += 24 * 60 * 60 * 1000;
  }

  const diffHours = diffMs / (1000 * 60 * 60);

  const hourlyRate = Number(marker.hourlyRate || marker.label.replace(/[^\d.-]/g, ''));

  const total = diffHours * hourlyRate;
  return Math.ceil(total * 100) / 100; // Arredonda para 2 casas decimais
}

  private getReservationDateTime(dateValue: string | Date, timeValue: string): Date | null {
    if (!dateValue || !timeValue || !timeValue.includes(':')) {
      return null;
    }

    const [hour, minute] = timeValue.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return null;
    }

    const reservationDate = dateValue instanceof Date ? new Date(dateValue) : this.parseDateString(dateValue);
    if (!reservationDate) {
      return null;
    }

    reservationDate.setHours(hour, minute, 0, 0);
    return reservationDate;
  }

  private parseDateString(value: string): Date | null {
    if (!value) {
      return null;
    }

    if (value.includes('/')) {
      const [day, month, year] = value.split('/').map(Number);
      if ([day, month, year].some(Number.isNaN)) {
        return null;
      }
      return new Date(year, month - 1, day);
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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
            latitude: parking.latitude,        // <-- Adicione isto
            longitude: parking.longitude,      // <-- Adicione isto
            selectedDate: parking.selectedDate,
            selectedTime: parking.selectedTime,
            selectedExitTime: parking.selectedExitTime,
            useDaily12h: !!parking.useDaily12h,
            dailyRate12h: parking.dailyRate12h || 0,
            hourlyRate: parking.hourlyRate || 0,
            total: this.calculateTotal(parking),
          })),
          clienteName: clienteName,
          activePromoCode: this.currentPromotionCode || null,
        },
      });

      console.log('Estacionamentos confirmados:', this.selectedParkings);
    }
  }
}
