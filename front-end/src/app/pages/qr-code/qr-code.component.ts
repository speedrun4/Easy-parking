import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QrCodeService, QrCodesResponse } from 'src/app/services/qr-code.service';
import { PaymentHistoryService } from 'src/app/services/payment-history.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-qr-code',
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.scss']
})
export class QrCodeComponent implements OnInit {
  paymentId?: number;
  entryImage?: string;
  exitImage?: string;
  entryStatus?: string;
  exitStatus?: string;
  parkingName?: string;
  parkingAddress?: string;
  reservationDate?: string;
  reservationStartTime?: string;
  loading = true;
  error?: string;
  private autoTimer?: any;
  readonly refreshIntervalMs = 30000; // 30s

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private qrService: QrCodeService,
    private payments: PaymentHistoryService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    // paymentId pode vir da navegação após pagamento
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { paymentId?: number } | undefined;
    if (state?.paymentId) {
      this.paymentId = state.paymentId;
      this.loadQrsByPayment(this.paymentId);
    } else {
      // Usa novo endpoint de último QR por usuário
      const user = this.auth.getCurrentUser();
      if (!user?.id) {
        this.error = 'É necessário estar autenticado para ver seus QR Codes.';
        this.loading = false;
        return;
      }
      this.startAuto();
      this.qrService.getLastByUser(user.id).subscribe({
        next: (res) => {
          this.paymentId = (res as any)?.paymentId;
          this.applyQrResponse(res);
          this.loading = false;
        },
        error: () => {
          this.error = 'Nenhum QR Code disponível para seu usuário.';
          this.loading = false;
        }
      });
    }
  }

  private loadQrsByPayment(id: number) {
    this.startAuto();
    this.qrService.getByPaymentId(id).subscribe({
      next: (res: QrCodesResponse) => {
        this.applyQrResponse(res);
        this.loading = false;
      },
      error: (err) => {
        // Se 404 (pagamento não encontrado), faz fallback para último pagamento do usuário
        const user = this.auth.getCurrentUser();
        if (err?.status === 404 && user?.id) {
          this.payments.getPaymentHistory(user.id).subscribe({
            next: (list: any[]) => {
              const last = (list || [])
                .filter(p => (p.status || '').toLowerCase() === 'pago')
                .sort((a,b) => (a.id || 0) - (b.id || 0))
                .pop();
              if (last?.id && last.id !== id) {
                this.paymentId = last.id;
                this.loadQrsByPayment(this.paymentId!);
                return;
              }
              this.error = 'QR Codes não disponíveis para este pagamento.';
              this.loading = false;
            },
            error: () => {
              this.error = 'Erro ao buscar pagamentos do usuário.';
              this.loading = false;
            }
          });
        } else {
          this.error = 'QR Codes não disponíveis para este pagamento.';
          this.loading = false;
        }
      }
    });
  }

  refresh() {
    this.loading = true;
    this.error = undefined;
    if (this.paymentId) {
      this.loadQrsByPayment(this.paymentId);
    } else {
      const user = this.auth.getCurrentUser();
      if (!user?.id) {
        this.error = 'É necessário estar autenticado para ver seus QR Codes.';
        this.loading = false;
        return;
        }
      this.qrService.getLastByUser(user.id).subscribe({
        next: (res) => {
          this.paymentId = (res as any)?.paymentId;
          this.applyQrResponse(res);
          this.loading = false;
        },
        error: () => {
          this.error = 'Nenhum QR Code disponível para seu usuário.';
          this.loading = false;
        }
      });
    }
  }

  private startAuto() {
    this.stopAuto();
    this.autoTimer = setInterval(() => this.refresh(), this.refreshIntervalMs);
  }

  private stopAuto() {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = undefined;
    }
  }

  private applyVisibilityRules() {
    if (["consumido", "expirado"].includes((this.entryStatus || '').toLowerCase())) {
      this.entryImage = undefined;
    }

    // Se o QR de saída foi consumido, ocultamos ambos os QRs
    if ((this.exitStatus || '').toLowerCase() === 'consumido') {
      this.entryImage = undefined;
      this.exitImage = undefined;
    }
  }

  private applyQrResponse(res: QrCodesResponse) {
    const entry = res.entry || null;
    const exit = res.exit || null;
    this.entryImage = entry?.imageBase64 ? `data:image/png;base64,${entry.imageBase64}` : undefined;
    this.exitImage = exit?.imageBase64 ? `data:image/png;base64,${exit.imageBase64}` : undefined;
    this.entryStatus = entry?.status;
    this.exitStatus = exit?.status;
    this.parkingName = res.parkingName || res.parkingAddress || 'Estacionamento reservado';
    this.parkingAddress = res.parkingAddress;
    this.reservationDate = res.reservationDate;
    this.reservationStartTime = res.reservationStartTime;
    this.applyVisibilityRules();
  }

  ngOnDestroy(): void {
    this.stopAuto();
  }
}
