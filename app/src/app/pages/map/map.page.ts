import { Component, ViewChild, OnInit, ElementRef, Renderer2 } from '@angular/core';
import { GestureController, ModalController } from '@ionic/angular';

import { Map, tileLayer, Marker } from 'leaflet';
import * as L from 'leaflet';
import 'leaflet.locatecontrol';

import { TrashAddPage } from '../trash/add/add.page';
import { FilterPage } from '../modals/filter/filter.page';
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
  mapMenuOffsetY: number; // store start Y coordinate while sliding menu

  map: Map;
  locator: any;
  markers: Array<Marker>;
  selectedPoi?: Trash;

  filters: { radius: number, trash: Array<boolean> };

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
    const layerMap = {
      'OSM': layerOsm,
      'Voyager': layerVoyager
    };

    this.map = new Map('map-leaflet', {
      layers: [layerOsm, layerVoyager],
    }).setView([0, 0], 2);
    L.control.layers(layerMap).addTo(this.map);

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

  async openFilterModal() {
    const modal = await this.modalCtrl.create({
      component: FilterPage,
      cssClass: 'trash-modal',
      swipeToClose: true
    });
    return await modal.present();
  }

  async openTrashAddModal() {
    const modal = await this.modalCtrl.create({
      component: TrashAddPage,
      cssClass: 'trash-modal',
      swipeToClose: true
    });
    return await modal.present();
  }

  formatDateTime(timestamp: string) {
    const datetime = new Date(timestamp);
    return `${datetime.getUTCDate()}.${datetime.getUTCMonth() + 1}.${datetime.getUTCFullYear()} UM ${datetime.getUTCHours()}:${datetime.getMinutes()}`;
  }

  private async listTrash() {
    const trashReports = await this.apiService.listTrash();
    trashReports.forEach(report => {
      const marker = new Marker([report.latitude, report.longitude]);
      marker.addTo(this.map).on('click', e => {
        this.selectedPoi = report;
        this.renderer.addClass(this.mapMenu.nativeElement, 'map-menu-active');
        this.renderer.setStyle(this.mapMenu.nativeElement, 'bottom', '0px');
      });
    });
  }

  private onSlideMenuStart($event) {
    this.mapMenuOffsetY = Number(this.mapMenu.nativeElement.style.bottom.substring(0, this.mapMenu.nativeElement.style.bottom.length - 2));
  }

  private onSlideMenuEnd($event) {
    this.mapMenuOffsetY = Number(this.mapMenu.nativeElement.style.bottom.substring(0, this.mapMenu.nativeElement.style.bottom.length - 2));
  }

  private onSlideMenuMove($event) {
    const newOffsetY = this.mapMenuOffsetY - $event.deltaY;
    if (newOffsetY <= 0) {
      this.renderer.setStyle(this.mapMenu.nativeElement, 'bottom', newOffsetY + 'px');
    }
  }
}
