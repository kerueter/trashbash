import { Component, ViewChild, OnInit, ElementRef, Renderer2 } from '@angular/core';
import { GestureController, ModalController } from '@ionic/angular';

import { Map, tileLayer, Marker } from 'leaflet';
import * as L from 'leaflet';
import 'leaflet.locatecontrol';

import { TrashAddPage } from '../trash/add/add.page';
import { ApiService } from 'src/app/service/api.service';
import { Trash } from 'src/app/models/Trash';

@Component({
  selector: 'app-map',
  templateUrl: 'map.page.html',
  styleUrls: ['map.page.scss']
})
export class MapPage implements OnInit {

  @ViewChild('mapMenu', {static: true, read: ElementRef })
  mapMenu: ElementRef;
  mapMenuY: number; // store start Y coordinate while sliding menu

  map: Map;
  locator: any;
  markers: Array<Marker>;
  selectedPoi?: Trash;

  constructor(
    private gestureCtrl: GestureController,
    private renderer: Renderer2,
    private modalCtrl: ModalController,
    private apiService: ApiService
  ) {
    this.markers = new Array<Marker>();
    this.selectedPoi = null;
  }

  ngOnInit() {
    // initialize OSM map
    const layerOsm = tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Kartendaten &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Mitwirkende'
    });
    const layerVoyager = tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    });

    this.map = new Map('map-leaflet', {
      layers: [layerOsm, layerVoyager],
    }).setView([0, 0], 2);

    setTimeout(() => {
      this.map.invalidateSize(true);
      this.locator = L.control.locate({
        showPopup: false,
        drawCircle: false
      }).addTo(this.map);
      this.locator.start();
    }, 1000);

    // add gesture for slider menu
    const gesture = this.gestureCtrl.create({
      gestureName: 'slideMenu',
      direction: 'y',
      el: this.mapMenu.nativeElement,
      onStart: ($event) => { this.onSlideMenuStart($event); },
      onMove: ($event) => { this.onSlideMenuMove($event); },
      onEnd: ($event) => { this.onSlideMenuEnd($event); }
    });
    gesture.enable();
    this.listTrash();
  }

  async openTrashAddModal() {
    const modal = await this.modalCtrl.create({
      component: TrashAddPage,
      cssClass: 'trash-modal',
      swipeToClose: true
    });
    return await modal.present();
  }

  private async listTrash() {
    const trashReports = await this.apiService.listTrash();
    trashReports.forEach(report => {
      const marker = new Marker([report.latitude, report.longitude]);
      marker.addTo(this.map).on('click', e => {
        this.selectedPoi = report;
        // convert datetimeString to date object
        this.selectedPoi.date = new Date(this.selectedPoi.time);
        // create string with the trash type
        if (this.selectedPoi.gruenabfall) {
          this.selectedPoi.trashTypeString = 'Grünabfall';
        }
        if (this.selectedPoi.hausmuell) {
          this.selectedPoi.trashTypeString = 'Hausmüll';
        }
        if (this.selectedPoi.sondermuell) {
          this.selectedPoi.trashTypeString = 'Sondermüll';
        }
        if (this.selectedPoi.sperrmuell) {
          this.selectedPoi.trashTypeString = 'Sperrmüll';
        }
        this.renderer.setStyle(this.mapMenu.nativeElement, 'height', '300px');
      });
    });
  }

  private onSlideMenuStart($event) {
    this.mapMenuY = this.mapMenu.nativeElement.offsetHeight;
  }

  private onSlideMenuEnd($event) {
    if (this.mapMenu.nativeElement.offsetHeight <= 100) {
      this.renderer.setStyle(this.mapMenu.nativeElement, 'height', '101px');
    }
    this.mapMenuY = this.mapMenu.nativeElement.offsetHeight;
  }

  private onSlideMenuMove($event) {
    if (this.mapMenu.nativeElement.offsetHeight > 50) {
      this.renderer.setStyle(this.mapMenu.nativeElement, 'height', (this.mapMenuY - $event.deltaY) + 'px');
    }
  }
}
