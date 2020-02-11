import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgbPaginationModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { ManageComponent } from './components/manage/manage.component';
import { AuthGuard } from './services/AuthGuard ';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ManageComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,

    // Pagination
    NgbPaginationModule,
    NgbTooltipModule,
  
    ServiceWorkerModule.register('./ngsw-worker.js', { enabled: environment.production })


    
  ],
  providers: [AuthGuard],
  bootstrap: [AppComponent]
})





export class AppModule {

  
 }
