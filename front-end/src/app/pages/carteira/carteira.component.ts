import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Carteira } from 'src/app/models/carteira.model';
import { CarteiraService } from 'src/app/services/carteira.service';

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

  dadosCartao = {
    numero: '',
    nome: '',
    validade: '',
    cvv: ''
  };

  qrCodeSrc: string = '';
  codigoPix: string = '';

  constructor(private carteiraService: CarteiraService, private http: HttpClient) { }

  ngOnInit(): void {
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
    const valor = this.valorOperacao;
    this.isLoading = true; // Inicia o carregamento enquanto gera o QR Code

    // Enviar a requisição para gerar o QR Code
    this.http.post('http://localhost:8080/api/pix', { valor: valor })
      .subscribe((response: any) => {
        this.codigoPix = response.codigoPix;
        this.qrCodeSrc = `data:image/png;base64,${response.qrCodeBase64}`;

        // Depois de gerar o QR Code, aguarde a confirmação do pagamento
        this.simularPagamento();
      }, error => {
        console.error('Erro ao gerar o QR Code:', error);
        this.isLoading = false; // Desabilita o loading em caso de erro
      });
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

