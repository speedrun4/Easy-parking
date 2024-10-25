import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EstacionamentoService } from 'src/app/services/estacionamento.service';
import { GeocodingService } from 'src/app/services/geocoding.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cadastro-estacionamento',
  templateUrl: './cadastro-estacionamento.component.html',
  styleUrls: ['./cadastro-estacionamento.component.scss']
})
export class CadastroEstacionamentoComponent implements OnInit {

  showUserForm = true; // Controle de qual formulário mostrar
  parkingForm!: FormGroup;
  mostrarModalSucesso = false;

  constructor(private fb: FormBuilder, private estacionamentoService: EstacionamentoService, private geocodingService: GeocodingService,  private router: Router) { }

  ngOnInit(): void {
    this.initializeParkingForm();
  }

  initializeParkingForm() {
    this.parkingForm = this.fb.group({
      companyName: ['', Validators.required],
      cnpj: ['', [Validators.required, Validators.pattern(/^\d{14}$/)]],  // Aceita apenas 14 dígitos numéricos
      hourlyRate: ['', Validators.required],
      address: ['', Validators.required],
      cep: ['', Validators.required],
      branchCeps: ['', Validators.required],
      phone: ['', Validators.required]
    });
  }

  onParkingSubmit() {
    if (this.parkingForm.valid) {
      const address = this.parkingForm.get('address')?.value;
      // Use o serviço de geocodificação para obter latitude e longitude
      this.geocodingService.getCoordinates(address).subscribe(coordinates => {
        if (coordinates) {
          const estacionamento = {
            ...this.parkingForm.value,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          };
          // Salvar no localStorage
          this.salvarEstacionamento(estacionamento);
          console.log('Estacionamento cadastrado e salvo localmente', estacionamento);
          this.mostrarModalSucesso = true;
          setTimeout(() => {
            this.mostrarModalSucesso = false;
            this.router.navigate(['/home']);  // Redireciona para a página Home
          }, 2000);
          // Redirecionar para a página home após salvar
          this.router.navigate(['/home']);  // Redireciona para a página Home
        } else {
          console.error('Endereço inválido');
        }
      });
    }
  }

  carregarEstacionamentos() {
    const estacionamentos = JSON.parse(localStorage.getItem('estacionamentos') || '[]');
    return estacionamentos;
  }
  salvarEstacionamento(estacionamento: any) {
    let estacionamentos = JSON.parse(localStorage.getItem('estacionamentos') || '[]');
    estacionamentos.push(estacionamento);
    localStorage.setItem('estacionamentos', JSON.stringify(estacionamentos));
  }

  onCnpjInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let cnpj = inputElement.value.replace(/\D/g, ''); // Remove todos os caracteres não numéricos

    // Limita a 14 dígitos
    if (cnpj.length > 14) {
      cnpj = cnpj.substring(0, 14);
    }

    // Aplica a máscara CNPJ: XX.XXX.XXX/XXXX-XX
    if (cnpj.length > 12) {
      cnpj = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    } else if (cnpj.length > 8) {
      cnpj = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1.$2.$3/$4');
    } else if (cnpj.length > 5) {
      cnpj = cnpj.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
    } else if (cnpj.length > 2) {
      cnpj = cnpj.replace(/(\d{2})(\d{3})/, '$1.$2');
    }

    // Atualiza o valor do campo com a máscara aplicada
    inputElement.value = cnpj;

    // Atualiza o valor do formulário com o CNPJ sem a máscara (só números)
    this.parkingForm.get('cnpj')?.setValue(cnpj.replace(/\D/g, ''));
  }

}
