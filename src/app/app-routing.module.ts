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

const routes: Routes = [
  { path: '', component: SplashComponent },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent }, // rota para a página de login
  { path: 'cadastro', component: CadastroComponent },
  { path: 'welcome', component: WelcomeComponent },
  { path: 'confirm', component: ConfirmComponent },
  { path: 'payment', component: PaymentComponent },
  { path: 'contato', component: ContatoComponent },
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
