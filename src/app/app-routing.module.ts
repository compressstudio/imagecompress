import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { AuthGuard } from './services/AuthGuard ';

const routes: Routes = [
  // Home Component
  {
    path: '',
    component: HomeComponent,
    children: [
      {
        path: ':view',
        component: HomeComponent,
        canActivate: [AuthGuard]
      },
      {
        path: '',
        component: HomeComponent
      }
    ]
  },

  // otherwise redirect to Signal Module.  
  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
