import { Component, ViewChild, OnInit, ElementRef, Renderer2 } from '@angular/core';
import { GestureController, ModalController, LoadingController } from '@ionic/angular';

import { Map, tileLayer, Marker } from 'leaflet';
import * as L from 'leaflet';
import 'leaflet.locatecontrol';

import { TrashAddPage } from '../modals/trash/add/add.page';
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
  mapMenuHeight: number;

  map: Map;
  isMapInBackground: boolean;
  locator: any;
  markers: Array<Marker>;
  selectedPoi?: Trash;

  filters: { radius: number, trash: Array<boolean> };

  constructor(
    private gestureCtrl: GestureController,
    private renderer: Renderer2,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private apiService: ApiService
  ) {
    this.markers = new Array<Marker>();
    this.selectedPoi = null;
    this.mapMenuHeight = 16;
    this.isMapInBackground = false;
  }

  async ngOnInit() {
    const loading = await this.loadingCtrl.create({
      message: 'App wird initialisiert...'
    });
    await loading.present();

    this.initializeMap();

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
    await loading.dismiss();
  }

  /**
   * Open modal for applying filters to map
   */
  async openFilterModal() {
    const modal = await this.modalCtrl.create({
      component: FilterPage,
      cssClass: 'trash-modal',
      swipeToClose: true,
      showBackdrop: true
    });
    this.isMapInBackground = true;
    modal.onWillDismiss().then(() => {
      this.isMapInBackground = false;
    });
    return await modal.present();
  }

  /**
   * Open modal for creating a new trash report
   */
  async openTrashAddModal() {
    const modal = await this.modalCtrl.create({
      component: TrashAddPage,
      cssClass: 'trash-modal',
      swipeToClose: true
    });
    this.isMapInBackground = true;
    modal.onWillDismiss().then(() => {
      this.isMapInBackground = false;
    });
    return await modal.present();
  }

  /**
   * Helper function to format datetime
   *
   * @param timestamp Timestamp as string
   */
  formatDateTime(timestamp: string) {
    const datetime = new Date(timestamp);
    return `${this.pad(datetime.getUTCDate(), 2)}.${this.pad(datetime.getUTCMonth() + 1, 2)}.${datetime.getUTCFullYear()} UM ${this.pad(datetime.getUTCHours(), 2)}:${this.pad(datetime.getMinutes(), 2)}`;
  }

  /**
   * Get all trash reports from API and add corresponing markers to map.
   * Markers contain click handler where report data get switched.
   */
  private async listTrash() {
    try {
      const trashReports = await this.apiService.listTrash();
      trashReports.forEach(report => this.addMarker(report));
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Add marker to leaflet map based on trash report
   *
   * @param report Trash report object
   */
  private addMarker(report: Trash) {
    const marker = new Marker([report.latitude, report.longitude]);
    marker.addTo(this.map).on('click', e => {
      this.selectedPoi = report;

      this.map.panTo([report.latitude, report.longitude]);
      this.renderer.addClass(this.mapMenu.nativeElement, 'map-menu-active');
      this.renderer.setStyle(this.mapMenu.nativeElement, 'bottom', '0px');

      // store map menu height after rendering
      setTimeout(() => {
        this.mapMenuHeight = this.mapMenu.nativeElement.offsetHeight;
      }, 100);
    });
  }

  /**
   * Event handler from gesture controller where element moving has been started
   *
   * @param $event Sliding event
   */
  private onSlideMenuStart($event) {
    this.mapMenuOffsetY = Number(this.mapMenu.nativeElement.style.bottom.substring(0, this.mapMenu.nativeElement.style.bottom.length - 2));
  }

  /**
   * Event handler from gesture controller where element moving has been ended
   *
   * @param $event Sliding event
   */
  private onSlideMenuEnd($event) {
    this.mapMenuOffsetY = Number(this.mapMenu.nativeElement.style.bottom.substring(0, this.mapMenu.nativeElement.style.bottom.length - 2));

    if (Math.abs(this.mapMenuOffsetY) < (this.mapMenuHeight / 3)) {
      this.renderer.setStyle(this.mapMenu.nativeElement, 'bottom', '0px');
    } else {
      const newHeight = `-${this.mapMenuHeight + 1}px`;
      this.renderer.setStyle(this.mapMenu.nativeElement, 'bottom', newHeight);
    }
  }

  /**
   * Event handler from gesture controller where element is currently moving
   *
   * @param $event Sliding event
   */
  private onSlideMenuMove($event) {
    const newOffsetY = this.mapMenuOffsetY - $event.deltaY;
    const velocityY = $event.velocityY;
    if (newOffsetY <= 0) { // only shift positive Y offset
      this.renderer.setStyle(this.mapMenu.nativeElement, 'bottom', newOffsetY + 'px');
    }
  }

  /**
   * Initialite leaflet map and locator
   */
  private initializeMap() {
    // create leaflet tile layers
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

    // add tile layers and controls to map
    this.map = new Map('map-leaflet', {
      layers: [layerOsm, layerVoyager],
    }).setView([0, 0], 2);
    L.control.layers(layerMap).addTo(this.map);

    // invalidate map size after 1 second of initialization for rendering purposes
    setTimeout(() => {
      this.map.invalidateSize(true);
      this.locator = L.control.locate({
        showPopup: false,
        drawCircle: false
      }).addTo(this.map);
      this.locator.start();
    }, 1000);
  }

  /**
   * Helper function for zero-padding a number to a padded string
   *
   * @param num Number to pad
   * @param size Size of string (incl. zero-padding)
   */
  private pad(num, size) {
    let s = String(num);
    while (s.length < (size || 2)) { s = '0' + s; }
    return s;
  }
}
