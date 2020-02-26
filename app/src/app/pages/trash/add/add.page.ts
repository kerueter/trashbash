import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-trash-add',
  templateUrl: './add.page.html',
  styleUrls: ['./add.page.scss'],
})
export class TrashAddPage implements OnInit {
  username: string;
  trashes: Array<{ val: string, isChecked: boolean, color: string}>;
  thumbnail: { url: string, captured: boolean };

  constructor(
    private modalCtrl: ModalController,
    private geolocation: Geolocation,
    private camera: Camera,
    private webview: WebView,
    public domSanitizer: DomSanitizer,
    private http: HttpClient
  ) {
    this.username = '';
    this.trashes = [
      { val: 'Hausmüll', isChecked: false, color: 'primary' },
      { val: 'Grünabfall', isChecked: false, color: 'success' },
      { val: 'Sperrmüll', isChecked: false, color: 'warning'},
      { val: 'Sondermüll', isChecked: false, color: 'danger' }
    ];
    this.thumbnail = {
      url: 'https://gravatar.com/avatar/dba6bae8c566f9d4041fb9cd9ada7741?d=identicon&f=y',
      captured: false
    };
  }

  ngOnInit() {}

  closeModal() {
    this.modalCtrl.dismiss({
      dismissed: true
    });
  }

  async takePhoto() {
    const options: CameraOptions = {
      quality: 100,
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE
    };
    let imageData: any;
    try {
      imageData = await this.camera.getPicture(options);
    } catch (e) {
      console.error(e);
    }
    if (imageData) {
      // this.thumbnail.url = this.webview.convertFileSrc(imageData);
      this.thumbnail.url = 'data:image/jpeg;base64,' + imageData;
      this.thumbnail.captured = true;
    }
  }

  async sendReport() {
    const location = await this.getLocation();
    this.http.post('http://igf-srv-lehre.igf.uni-osnabrueck.de:1338/trash', {
      time: new Date().getTime() / 1000,
      username: this.username,
      latitude: location.lat,
      longitude: location.lng,
      hausMuell: this.trashes[0].isChecked,
      gruenAbfall: this.trashes[1].isChecked,
      sperrMuell: this.trashes[2].isChecked,
      sonderMuell: this.trashes[3].isChecked,
      photo: this.thumbnail.url
    }, { headers: { 'Content-Type': 'application/json' } })
    .subscribe(data => {
      console.log(data);
    });
    this.closeModal();
  }

  private async getLocation(): Promise<{lat: number, lng: number}> {
    let data: any;
    try {
      data = await this.geolocation.getCurrentPosition();
    } catch (e) {
      throw new Error('Unable to get current position.');
    }
    return {
      lat: data.coords.latitude,
      lng: data.coords.longitude
    };
  }
}
