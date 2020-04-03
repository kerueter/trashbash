import { Component, OnInit } from '@angular/core';

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

  constructor(
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private actionSheetController: ActionSheetController,
    private geolocation: Geolocation,
    private camera: Camera,
    private apiService: ApiService
  ) {
    this.username = '';
    this.trashes = [
      { val: 'Hausmüll', isChecked: false, color: 'primary' },
      { val: 'Grünabfall', isChecked: false, color: 'success' },
      { val: 'Sperrmüll', isChecked: false, color: 'warning'},
      { val: 'Sondermüll', isChecked: false, color: 'danger' }
    ];
  }

  ngOnInit() {}

  closeModal() {
    this.modalCtrl.dismiss({
      dismissed: true
    });
  }

  async requestPhoto() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Möchtest du noch ein Foto erstellen?',
      buttons: [
      {
        text: 'Ja',
        icon: 'camera',
        handler: () => {
          this.selectImage();
        }
      },
      {
        text: 'Nein',
        icon: 'camera',
        handler: () => {
          this.sendReport();
        }
      },
      {
        text: 'Abbrechen',
        icon: 'close',
        role: 'cancel',
        handler: () => {
          console.log('Sending report cancelled.');
        }
      }]
    });
    await actionSheet.present();
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
        text: 'Abbrechen',
        icon: 'close',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      }]
    });
    await actionSheet.present();
  }

  private async getImage(sourceType: number) {
    const options: CameraOptions = {
      quality: 100,
      sourceType,
      destinationType: this.camera.DestinationType.FILE_URI,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE
    };
    try {
      const imageData = await this.camera.getPicture(options);
      this.sendReport(imageData);
    } catch (e) {
      console.error(e);
    }
  }

  async sendReport(imageData?: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Report wird übermittelt...'
    });
    await loading.present();

    try {
      const location = await this.getLocation();

      // first upload photo, if captured
      let photoLocation = null;
      if (imageData) {
        const photoRes = await this.apiService.postTrashImage(imageData);
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
