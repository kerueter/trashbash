import { Component, OnInit, Input } from '@angular/core';

import { ModalController, LoadingController, ActionSheetController, ToastController } from '@ionic/angular';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';

import { LatLng } from 'leaflet';

import { ApiService } from 'src/app/service/api.service';
import { MapService } from 'src/app/service/map.service';
import { Trash } from 'src/app/models/Trash';

@Component({
  selector: 'app-trash-add',
  templateUrl: './add.page.html',
  styleUrls: ['./add.page.scss'],
})
export class TrashAddPage implements OnInit {
  @Input() userLocation: LatLng;

  username: string;
  trashes: Array<{ val: string, isChecked: boolean, color: string}>;

  /**
   * Constructor of the trash add modal page
   *
   * @param modalCtrl
   * @param loadingCtrl
   * @param actionSheetController
   * @param toastCtrl
   * @param camera
   * @param mapService
   * @param apiService
   */
  constructor(
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private actionSheetController: ActionSheetController,
    private toastCtrl: ToastController,
    private camera: Camera,
    private mapService: MapService,
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

  /**
   * Function to request photo with action sheet controller
   * If yes, photo will be captured, if no, report will be sent without photo, else sending is aborted
   */
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

  /**
   * Select the source of the image
   * Possible to capture a photo or choose a photo from photo library of the phone
   */
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

  /**
   * Close the trash add modal and pass report got as response from backend
   *
   * @param resp Report as backend response
   */
  closeModal(resp?: Trash) {
    this.modalCtrl.dismiss({
      report: resp
    });
  }

  /**
   * Get image from chosed source
   *
   * @param sourceType Source of the image to be sent
   */
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

  /**
   * Send report to the backend
   *
   * @param imageData Optional image data, if image was captured
   */
  async sendReport(imageData?: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Report wird übermittelt...'
    });
    await loading.present();

    let sendStatus = true;
    try {
      // first upload photo, if captured
      let photoLocation = null;
      if (imageData && imageData.length > 0) {
        const photoRes = await this.apiService.postTrashImage(imageData);
        const parsedPhotoRes = JSON.parse(photoRes.response);
        console.log(parsedPhotoRes);
        photoLocation = parsedPhotoRes.Location;
      }

      const resp = await this.apiService.postTrash({
        time: new Date().getTime() / 1000,
        username: this.username,
        latitude: this.userLocation.lat,
        longitude: this.userLocation.lng,
        hausMuell: this.trashes[0].isChecked,
        gruenAbfall: this.trashes[1].isChecked,
        sperrMuell: this.trashes[2].isChecked,
        sonderMuell: this.trashes[3].isChecked,
        photo: photoLocation ? photoLocation : ''
      });
      this.mapService.addItemToCollection(resp);
      this.closeModal(resp);
    } catch (e) {
      console.error(e);
      sendStatus = false;
    } finally {
      await loading.dismiss();

      // create toast after report has been sent
      const toast = await this.toastCtrl.create({
        message: sendStatus ? 'Danke für deinen Report! <3' : 'Oh snap! Dein Report konnte nicht übermittelt werden.',
        duration: 2000
      });
      toast.present();
    }
  }
}
