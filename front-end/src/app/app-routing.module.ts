import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { CadastroComponent } from './pages/cadastro/cadastro.component';
import { WelcomeComponent } from './pages/welcome/welcome.component';
import { ConfirmComponent } from './pages/confirm/confirm.component';
import { PaymentComponent } from './pages/payment/payment.component';
import { SplashComponent } from './components/splash/splash.component';
import { LoginComponent } from './pages/login/login.component';
import { ContatoComponent } from './pages/contato/contato.component';
import { CarteiraComponent } from './pages/carteira/carteira.component';
import { PaymentHistoryComponent } from './pages/payment-history/payment-history.component';
import { ClienteComponent } from './pages/cliente/cliente.component';
import { EsqueciSenhaComponent } from './pages/esqueci-senha/esqueci-senha.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { CadastroEstacionamentoComponent } from './pages/cadastro-estacionamento/cadastro-estacionamento.component';

const routes: Routes = [
  { path: '', component: SplashComponent },
  { path: 'home', component: HomeComponent },
  { path: 'esqueci-senha', component: EsqueciSenhaComponent }, 
  {path: 'reset-password', component: ResetPasswordComponent},
  {path: 'cadastro-estacionamento', component: CadastroEstacionamentoComponent},
  { path: 'login', component: LoginComponent }, // rota para a página de login
  { path: 'cadastro', component: CadastroComponent },
  { path: 'cliente', component: ClienteComponent },
  { path: 'welcome', component: WelcomeComponent },
  { path: 'confirm', component: ConfirmComponent },
  { path: 'payment', component: PaymentComponent },
  { path: 'contato', component: ContatoComponent },
  { path: 'carteira', component: CarteiraComponent },
  { path: 'history', component: PaymentHistoryComponent },
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
  { path: 'splash', component: SplashComponent }, // rota para página não encontrada
  { path: '', redirectTo: '/splash', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
