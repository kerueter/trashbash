import { Component, ViewChild, OnInit, ElementRef, Renderer2 } from '@angular/core';
import { GestureController, ModalController, LoadingController } from '@ionic/angular';
import { Storage } from '@ionic/storage';

import { Map, tileLayer, Marker } from 'leaflet';
import * as L from 'leaflet';
import 'leaflet.locatecontrol';

import { TrashAddPage } from '../modals/trash/add/add.page';
import { FilterPage } from '../modals/filter/filter.page';
import { ApiService } from 'src/app/service/api.service';
import { Trash } from 'src/app/models/Trash';
import { Filters } from 'src/app/models/Filters';

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
  markerReports: Array<{ marker: Marker, report: Trash, enabled: boolean}>;
  selectedPoi?: Trash;

  filters: Filters;

  constructor(
    private gestureCtrl: GestureController,
    private renderer: Renderer2,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private storage: Storage,
    private apiService: ApiService
  ) {
    this.markerReports = new Array<{ marker: Marker, report: Trash, enabled: boolean}>();
    this.selectedPoi = null;
    this.mapMenuHeight = 16;
    this.isMapInBackground = false;
  }

  async ngOnInit() {
    const loading = await this.loadingCtrl.create({
      message: 'App wird initialisiert...'
    });
    await loading.present();

    // apply filters
    const filterRadius: number = await this.storage.get('filter-radius');
    const filterTrash: Array<boolean> = await this.storage.get('filter-trash');
    const filterUsername: string = await this.storage.get('filter-username');

    this.filters = {
      radius: filterRadius || 100,
      trash: filterTrash && filterTrash.length === 4 ? filterTrash : [true, true, true, true],
      username: filterUsername || ''
    };

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
    await loading.dismiss();
  }

  /**
   * Open modal for applying filters to map
   */
  async openFilterModal() {
    const modal = await this.modalCtrl.create({
      component: FilterPage,
      componentProps: {
        filters: this.filters
      },
      cssClass: 'trash-modal',
      swipeToClose: true,
      showBackdrop: true
    });
    this.isMapInBackground = true;
    modal.onWillDismiss().then(data => {
      const radiusChanged = this.filters.radius !== data.data.filters.radius;

      this.filters = data.data.filters;
      this.isMapInBackground = false;
      this.applyFilters(radiusChanged);
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
  private async listTrash(latitude: number, longitude: number, radius: number) {
    try {
      const trashReports = await this.apiService.listTrash(latitude, longitude, radius);
      trashReports.forEach(report => this.addMarker(report));
      this.applyFilters(false);
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
    this.markerReports.push({
      marker: new Marker([report.latitude, report.longitude]),
      report,
      enabled: true
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
    this.map.on('locationfound', this.onLocationFound.bind(this));
    this.map.on('locationerror', this.onLocationError.bind(this));

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

  private onLocationFound(e) {
    this.listTrash(e.latitude, e.longitude, this.filters.radius);
  }

  private onLocationError(e) {
    alert(e.message);
  }

  private applyFilters(radiusChanged: boolean) {
    console.log('Apply filters: ', this.filters);

    this.markerReports.forEach(markerReport => {
      if (markerReport.enabled) {
        markerReport.marker.remove();
      }
    });

    // retrieve trash reports again from backend
    if (radiusChanged) {
      this.listTrash(52, 8, this.filters.radius);
    }

    this.markerReports.forEach(markerReport => {
      markerReport.enabled =
        (this.filters.trash[0] && markerReport.report.hausmuell ||
        this.filters.trash[1] && markerReport.report.gruenabfall ||
        this.filters.trash[2] && markerReport.report.sperrmuell ||
        this.filters.trash[3] && markerReport.report.sondermuell) &&
        (!this.filters.username || markerReport.report.username === this.filters.username);

      console.log(markerReport.enabled);

      if (markerReport.enabled) {
        markerReport.marker.addTo(this.map).on('click', e => {
          this.selectedPoi = markerReport.report;

          this.map.panTo([
            markerReport.report.latitude,
            markerReport.report.longitude
          ]);
          this.renderer.addClass(this.mapMenu.nativeElement, 'map-menu-active');
          this.renderer.setStyle(this.mapMenu.nativeElement, 'bottom', '0px');

          // store map menu height after rendering
          setTimeout(() => {
            this.mapMenuHeight = this.mapMenu.nativeElement.offsetHeight;
          }, 100);
        });
      }
    });
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
