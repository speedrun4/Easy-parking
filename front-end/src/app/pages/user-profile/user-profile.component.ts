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
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      this.previewPhotoUrl = dataUrl; // data URL
      this.savePhoto(base64, dataUrl);
    };
    reader.onerror = () => {
      this.snackBar.open('Falha ao ler a imagem. Tente novamente.', 'Fechar', { duration: 3000 });
    };
    reader.readAsDataURL(file);
  }

  private savePhoto(fotoBase64: string, dataUrl?: string): void {
    try {
      this.isUpdatingPhoto = true;
      // Atualiza localmente; se houver API no futuro, substituir por chamada HTTP
      this.authService.updateUserPhoto(fotoBase64, dataUrl);
      // Atualiza dados locais para refletir imediatamente
      this.userData = this.authService.getCurrentUser();
      this.snackBar.open('Foto atualizada com sucesso!', 'Fechar', { duration: 2500 });
    } catch (e) {
      console.error(e);
      this.snackBar.open('Não foi possível atualizar a foto.', 'Fechar', { duration: 3000 });
    } finally {
      this.isUpdatingPhoto = false;
    }
  }
}
