import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { CarouselComponent } from './components/carousel/carousel.component';
import { AboutComponent } from './components/about/about.component';
import { CarouselModule } from 'ngx-bootstrap/carousel';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HomeComponent } from './pages/home/home.component';
import { CadastroComponent } from './pages/cadastro/cadastro.component';
import { WelcomeComponent } from './pages/welcome/welcome.component';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { AgmCoreModule } from '@agm/core';
import {MatCardModule} from '@angular/material/card';
import { HttpClientModule } from '@angular/common/http';
import { ConfirmComponent } from './pages/confirm/confirm.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { PaymentComponent } from './pages/payment/payment.component';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SplashComponent } from './components/splash/splash.component';
import { FooterComponent } from './components/footer/footer.component';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { LoginComponent } from './pages/login/login.component';
import { ContatoComponent } from './pages/contato/contato.component';
import { CarteiraComponent } from './pages/carteira/carteira.component';
import { PaymentHistoryComponent } from './pages/payment-history/payment-history.component';
import { MatDialogModule } from '@angular/material/dialog';
import { ErrorDialogComponent } from './components/error-dialog/error-dialog.component';
import { ClienteComponent } from './pages/cliente/cliente.component';
import { AboutClienteComponent } from './components/about-cliente/about-cliente.component';
import { CarouselClienteComponent } from './components/carousel-cliente/carousel-cliente.component';
import { EsqueciSenhaComponent } from './pages/esqueci-senha/esqueci-senha.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { CadastroEstacionamentoComponent } from './pages/cadastro-estacionamento/cadastro-estacionamento.component';
import { FinancasComponent } from './pages/financas/financas.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { SucessoModalComponent } from './components/sucess-modal/sucess-modal.component';
import { UserProfileComponent } from './pages/user-profile/user-profile.component';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';
import { PreReservaComponent } from './pages/pre-reserva/pre-reserva.component';
import { ExpiradoModalComponent } from './components/expirado-modal/expirado-modal.component';
import { LOCALE_ID } from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { AlertDialogCancelComponent } from './components/alert-dialog-cancel/alert-dialog-cancel.component';
import { RouteComponent } from './pages/route/route.component';
registerLocaleData(localePt);

@NgModule({
  declarations: [
    ConfirmationDialogComponent,
    ExpiradoModalComponent,
    AppComponent,
    HeaderComponent,
    CarouselComponent,
    AboutComponent,
    LoginComponent,
    HomeComponent,
    CadastroComponent,
    WelcomeComponent,
    ConfirmComponent,
    PaymentComponent,
    SplashComponent,
    FooterComponent,
    ContatoComponent,
    CarteiraComponent,
    PaymentHistoryComponent,
    ErrorDialogComponent,
    ClienteComponent,
    AboutClienteComponent,
    CarouselClienteComponent,
    EsqueciSenhaComponent,
    ResetPasswordComponent,
    CadastroEstacionamentoComponent,
    FinancasComponent,
    SucessoModalComponent,
    UserProfileComponent,
    PreReservaComponent,
    AlertDialogCancelComponent,
    RouteComponent,
  ],
  imports: [
    MatButtonModule,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    CarouselModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatToolbarModule,
    MatDialogModule,
    MatSnackBarModule,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    NgxMaterialTimepickerModule,
    AgmCoreModule.forRoot({
      apiKey: 'AIzaSyC1JY-mIJMlZinIwKj3jJYoCV9sXrpWmSk'
    }),
    MatFormFieldModule,
    MatInputModule,
    HttpClientModule,
    CommonModule
    
  ],
  entryComponents: [ErrorDialogComponent],
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' }
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule { }
