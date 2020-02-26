import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'add',
    loadChildren: () => import('./pages/modals/trash/add/add.module').then( m => m.AddPageModule)
  },
  {
    path: 'filter',
    loadChildren: () => import('./pages/modals/filter/filter.module').then( m => m.FilterPageModule)
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
