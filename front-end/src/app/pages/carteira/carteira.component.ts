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
    // Realiza a requisição POST para gerar o código PIX no backend
    const valor = this.valorOperacao;
   this.http.post('http://localhost:8080/api/pix', { valor: valor })  // Certifique-se de que `valorOperacao` é um número com casas decimais (Double)
    .subscribe((response: any) => {
      this.codigoPix = response.codigoPix;
      this.qrCodeSrc = `data:image/png;base64,${response.qrCodeBase64}`;
    });
  }
  
  arrayBufferToBase64(buffer: any): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const length = bytes.byteLength;
    for (let i = 0; i < length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  copiarCodigoPix() {
    navigator.clipboard.writeText(this.codigoPix).then(() => {
      alert('Código PIX copiado com sucesso!');
    }).catch(err => {
      console.error('Erro ao copiar o código PIX:', err);
    });
  }
  processarPagamento(metodo: string) {
    // Exemplo de salvamento na base de acordo com o usuário logado
    this.carteiraService.adicionarValor(this.valorOperacao, this.descricaoOperacao, metodo);

    // Fechar o modal após a operação
    this.fecharModal();

    // Atualizar o saldo da carteira
    this.carteira = this.carteiraService.obterCarteira();

    // Resetar os inputs
    this.valorOperacao = 0;
    this.descricaoOperacao = '';
  }

  confirmarPagamento() {
    if (this.metodoSelecionado === 'cartao') {
      console.log('Pagamento com cartão:', this.dadosCartao);
    } else if (this.metodoSelecionado === 'pix') {
      console.log('Pagamento com PIX confirmado.');
    }

    // Atualiza a carteira e registra a transação
    this.carteiraService.adicionarValor(this.valorOperacao, this.descricaoOperacao, this.metodoSelecionado!);

    // Fecha o modal e reseta os dados
    this.fecharModal();
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
