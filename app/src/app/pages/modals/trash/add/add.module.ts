import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';

import { AddPageRoutingModule } from './add-routing.module';

import { TrashAddPage } from './add.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HttpClientModule,
    AddPageRoutingModule
  ],
  declarations: [TrashAddPage]
})
export class AddPageModule {}
