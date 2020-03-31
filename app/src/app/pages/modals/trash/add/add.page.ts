import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { ModalController, LoadingController, ActionSheetController } from '@ionic/angular';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';

import { ApiService } from 'src/app/service/api.service';

@Component({
  selector: 'app-trash-add',
  templateUrl: './add.page.html',
  styleUrls: ['./add.page.scss'],
})
export class TrashAddPage implements OnInit {
  username: string;
  trashes: Array<{ val: string, isChecked: boolean, color: string}>;
  photo: { url: string, captured: boolean };

  constructor(
    public domSanitizer: DomSanitizer,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private actionSheetController: ActionSheetController,
    private geolocation: Geolocation,
    private camera: Camera,
    private webview: WebView,
    private apiService: ApiService
  ) {
    this.username = '';
    this.trashes = [
      { val: 'Hausmüll', isChecked: false, color: 'primary' },
      { val: 'Grünabfall', isChecked: false, color: 'success' },
      { val: 'Sperrmüll', isChecked: false, color: 'warning'},
      { val: 'Sondermüll', isChecked: false, color: 'danger' }
    ];
    this.photo = {
      url: 'https://www.creativefabrica.com/wp-content/uploads/2018/07/Camera-icon-by-harisprawoto-1-580x386.jpg',
      captured: false
    };
  }

  ngOnInit() {}

  closeModal() {
    this.modalCtrl.dismiss({
      dismissed: true
    });
  }

  async selectImage() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Quelle wählen',
      buttons: [
      {
        text: 'Foto aufnehmen',
        icon: 'camera',
        handler: () => {
          this.getImage(this.camera.PictureSourceType.CAMERA);
        }
      },
      {
        text: 'Aus Fotogalerie',
        icon: 'share',
        handler: () => {
          this.getImage(this.camera.PictureSourceType.PHOTOLIBRARY);
        }
      },
      {
        text: 'Cancel',
        icon: 'close',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      }]
    });
    await actionSheet.present();
  }

  async getImage(sourceType: number) {
    const options: CameraOptions = {
      quality: 100,
      sourceType,
      destinationType: this.camera.DestinationType.FILE_URI,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE
    };
    try {
      const imageData = await this.camera.getPicture(options);
      this.photo.url = imageData;
      this.photo.captured = true;
    } catch (e) {
      console.error(e);
    }
  }

  pathForImage(img: string) {
    if (img === null) {
      return '';
    } else {
      const converted = this.webview.convertFileSrc(img);
      return converted;
    }
  }

  async sendReport() {
    const loading = await this.loadingCtrl.create({
      message: 'Report wird übermittelt...'
    });
    await loading.present();

    try {
      const location = await this.getLocation();

      // first upload photo, if captured
      let photoLocation = null;
      if (this.photo.captured) {
        const photoRes = await this.apiService.postTrashImage(this.photo.url);
        const parsedPhotoRes = JSON.parse(photoRes.response);
        console.log(parsedPhotoRes);
        photoLocation = parsedPhotoRes.Location;
      }

      const resp = await this.apiService.postTrash({
        time: new Date().getTime() / 1000,
        username: this.username,
        latitude: location.lat,
        longitude: location.lng,
        hausMuell: this.trashes[0].isChecked,
        gruenAbfall: this.trashes[1].isChecked,
        sperrMuell: this.trashes[2].isChecked,
        sonderMuell: this.trashes[3].isChecked,
        photo: photoLocation ? photoLocation : ''
      });
      console.log(resp);
    } catch (e) {
      console.error(e);
    } finally {
      await loading.dismiss();
      this.closeModal();
    }
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
