import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  userData: any = null; // Dados do usuário
  displayedColumns: string[] = ['nomeCompleto', 'email', 'telefone', 'acoes'];
  previewPhotoUrl: string | null = null;
  isUpdatingPhoto = false;

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchUserData();
  }

  fetchUserData(): void {
    this.userData = this.authService.getCurrentUser();
    if (!this.userData || !this.userData.id) {
      console.error('Erro: Dados do usuário estão incompletos ou ID não definido!', this.userData);
    } // Obtém os dados do usuário logado
  }

  deleteAccount(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '350px',
      data: { message: 'Tem certeza de que deseja excluir sua conta? Esta ação não poderá ser desfeita.' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        const userId = this.userData.id;
        if (!userId) {
          console.error('ID do usuário está indefinido!');
          return;
        }
        this.authService.deleteAccount(userId).subscribe(
          () => {
            this.snackBar.open('Conta excluída com sucesso!', 'Fechar', { duration: 3000 });
            this.authService.logout();
            this.userData = null;
            this.router.navigate(['/home']);
          },
          (error) => {
            this.snackBar.open('Erro ao excluir a conta. Tente novamente mais tarde.', 'Fechar', { duration: 3000 });
            console.error('Erro ao excluir a conta:', error);
          }
        );
      }
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Por favor, selecione uma imagem válida.', 'Fechar', { duration: 3000 });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const originalDataUrl = reader.result as string;
      // Redimensiona/comprime a imagem antes de enviar, pois fotos de câmera em
      // alta resolução geram um base64 muito grande e podem falhar ao salvar.
      this.resizeImage(originalDataUrl, 800, 0.7)
        .then((dataUrl) => {
          const base64 = dataUrl.split(',')[1];
          this.previewPhotoUrl = dataUrl;
          this.savePhoto(base64, dataUrl);
        })
        .catch(() => {
          // Se a compressão falhar por algum motivo, usa a imagem original como fallback.
          const base64 = originalDataUrl.split(',')[1];
          this.previewPhotoUrl = originalDataUrl;
          this.savePhoto(base64, originalDataUrl);
        });
    };
    reader.onerror = () => {
      this.snackBar.open('Falha ao ler a imagem. Tente novamente.', 'Fechar', { duration: 3000 });
    };
    reader.readAsDataURL(file);
  }

  // Redimensiona a imagem para no máximo `maxSize` px no maior lado e comprime como JPEG,
  // reduzindo drasticamente o tamanho do base64 enviado ao backend.
  private resizeImage(dataUrl: string, maxSize: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas não suportado'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.src = dataUrl;
    });
  }

  private savePhoto(fotoBase64: string, dataUrl?: string): void {
    this.isUpdatingPhoto = true;
    this.authService.updateUserPhoto(fotoBase64, dataUrl).subscribe({
      next: () => {
        this.userData = this.authService.getCurrentUser();
        this.snackBar.open('Foto atualizada com sucesso!', 'Fechar', { duration: 2500 });
        this.isUpdatingPhoto = false;
      },
      error: (err) => {
        console.error('Falha ao salvar foto no servidor:', err);
        this.userData = this.authService.getCurrentUser();
        this.snackBar.open(
          'Não foi possível salvar a foto no servidor. Ela pode desaparecer ao sair do app.',
          'Fechar',
          { duration: 5000 }
        );
        this.isUpdatingPhoto = false;
      }
    });
  }
}
