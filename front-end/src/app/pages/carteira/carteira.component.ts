import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Carteira } from 'src/app/models/carteira.model';
import { CarteiraService } from 'src/app/services/carteira.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-carteira',
  templateUrl: './carteira.component.html',
  styleUrls: ['./carteira.component.scss']
})
export class CarteiraComponent implements OnInit {

  carteira: Carteira = { saldo: 0, historicoTransacoes: [] };
  valorOperacao: number = 0;
  descricaoOperacao: string = '';
  mostrarModal: boolean = false;
  metodoSelecionado: string | null = null;
  isLoading: boolean = false; // Estado de loading
  nomeLoja: string = "Easy-Parking"; // Nome da loja
  cidade: string = "Barueri"; // Nome da cidade

  chavePix = '05121324456';

  dadosCartao = {
    numero: '',
    nome: '',
    validade: '',
    cvv: ''
  };

  qrCodeSrc: string = '';
  codigoPix: string = '';

  constructor(private carteiraService: CarteiraService, private http: HttpClient, private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    if (this.metodoSelecionado === 'pix') {
      this.gerarQRCodePIX();
    }
    this.carteira = this.carteiraService.obterCarteira();
  }

  abrirModal() {
    this.mostrarModal = true;
  }

  fecharModal() {
    this.mostrarModal = false;
    this.metodoSelecionado = null;
    this.resetarDadosPagamento();
  }

  selecionarMetodo(metodo: string) {
    this.metodoSelecionado = metodo;
    if (metodo === 'pix') {
      this.gerarQRCodePIX();
    }
  }

  
  gerarQRCodePIX() {
    const payload = this.montarPayloadPix();  // Monta o payload do PIX
    QRCode.toDataURL(payload, { width: 300, margin: 1 }, (err, url) => {  // Gera o QR Code
      if (err) {
        console.error('Erro ao gerar QR Code', err);
      } else {
        this.qrCodeSrc = url;  // Define a URL do QR Code gerado
        this.codigoPix = payload; // Define o código PIX gerado
      }
    });
  }


  montarPayloadPix(): string {
    const valorFormatado = (this.valorOperacao * 100).toString(); // Valor em centavos
    return `00020101021126580014BR.GOV.BCB.PIX0114${this.chavePix}520400005303986540${valorFormatado}5802BR5908${this.nomeLoja}6009${this.cidade}62070503***6304`;
  }

  // Função para simular o processamento do pagamento
  simularPagamento() {
    setTimeout(() => {
      // Aqui você pode verificar com o backend se o pagamento foi confirmado, se necessário
      // Simulação de confirmação de pagamento (por exemplo, checando um status no backend)

      // Adicionar o valor à carteira
      this.carteiraService.adicionarValor(this.valorOperacao, this.descricaoOperacao, 'pix');
      this.carteira = this.carteiraService.obterCarteira();

      // Após o pagamento ser confirmado, desative o estado de carregamento
      this.isLoading = false;

      // Fechar o modal após o pagamento ser realizado
      this.fecharModal();
    }, 5000); // Simula 5 segundos de espera pelo pagamento
  }

  copiarCodigoPix() {
    navigator.clipboard.writeText(this.codigoPix).then(() => {
      alert('Código PIX copiado com sucesso!');
    }).catch(err => {
      console.error('Erro ao copiar o código PIX:', err);
    });
  }

  resetarDadosPagamento() {
    this.dadosCartao = { numero: '', nome: '', validade: '', cvv: '' };
    this.qrCodeSrc = '';
  }

  remover() {
    this.carteiraService.removerValor(this.valorOperacao, this.descricaoOperacao);
    this.valorOperacao = 0;
    this.descricaoOperacao = '';
  }
}

