import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { Camera } from '@ionic-native/camera/ngx';
import { File } from '@ionic-native/file/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { HTTP } from '@ionic-native/http/ngx';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TrashAddPage } from './pages/modals/trash/add/add.page';
import { FormsModule } from '@angular/forms';
import { FilterPage } from './pages/modals/filter/filter.page';

@NgModule({
  declarations: [AppComponent, TrashAddPage, FilterPage],
  entryComponents: [TrashAddPage, FilterPage],
  imports: [
    BrowserModule,
    FormsModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    Geolocation,
    Camera,
    File,
    WebView,
    HTTP,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
