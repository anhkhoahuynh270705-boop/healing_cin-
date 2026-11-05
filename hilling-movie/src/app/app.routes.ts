import { Routes } from '@angular/router';
import { CinemaPageComponent } from './features/cinema/cinema-page/cinema-page.component';
import { AdminPageComponent } from './features/admin/admin-page/admin-page.component';


export const routes: Routes = [
  { path: 'admin', component: AdminPageComponent },
  { path: '', component: CinemaPageComponent },
  { path: '**', redirectTo: '' },
];
