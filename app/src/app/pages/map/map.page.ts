import { Component, ViewChild, OnInit, ElementRef, Renderer2 } from '@angular/core';
import { GestureController, ModalController, LoadingController } from '@ionic/angular';

import { Map, tileLayer, Marker, icon, control } from 'leaflet';
import * as L from 'leaflet';
import 'leaflet.locatecontrol';

import { MapService } from 'src/app/service/map.service';

import { TrashAddPage } from '../modals/trash/add/add.page';
import { FilterPage } from '../modals/filter/filter.page';

import { Trash } from 'src/app/models/Trash';
import { Filter } from 'src/app/models/Filters';

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

  private currentLocation: { marker: Marker, follow: boolean };
  private controlUI;

  constructor(
    private gestureCtrl: GestureController,
    private renderer: Renderer2,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private mapService: MapService
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

    // initialize leaflet map
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
        filter: this.mapService.getFilters()
      },
      cssClass: 'trash-modal',
      swipeToClose: false,
      showBackdrop: true
    });
    this.isMapInBackground = true;
    modal.onDidDismiss().then(data => {
      const modalFilter = new Filter(
        data.data.filter.radius,
        data.data.filter.trash.map(m => m.isChecked),
        data.data.filter.username,
        data.data.filter.startDate,
        data.data.filter.endDate
      );
      const filterChanged = !this.mapService.getFilters().equals(modalFilter);

      if (filterChanged) {
        this.mapService.setFilters(modalFilter);
        this.applyFilters(filterChanged);
      }
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
      swipeToClose: false
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
   * Add marker to leaflet map based on trash report
   *
   * @param report Trash report object
   */
  private addMarker(report: Trash) {
    const trashLocationIcon = icon({
      iconUrl: '../../assets/icon/marker-trash.svg',
      iconSize: [40, 40],
    });
    this.markerReports.push({
      marker: new Marker([report.latitude, report.longitude], { icon: trashLocationIcon }),
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
  private async initializeMap() {
    // get and subscribe user location
    try {
      const currentLoc = await this.mapService.getUserLocation();

      const userLocationIcon = icon({
        iconUrl: '../../assets/icon/location_my.svg',
        iconSize: [40, 40],
      });
      this.currentLocation = {
        marker: new Marker([currentLoc.lat, currentLoc.lng], { icon: userLocationIcon }),
        follow: true
      };

      // setup subscriber for user location
      this.mapService.getUserLocationObserver().subscribe(locationData => {
        this.currentLocation.marker.setLatLng([
          locationData.coords.latitude, locationData.coords.longitude
        ]);

        if (this.currentLocation.follow) {
          this.map.panTo(this.currentLocation.marker.getLatLng());
        }
      });
    } catch (e) {
      console.error(e);
    }

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
    (L.Control as any).Location = L.Control.extend(
    {
        options: { position: 'topleft' },
        onAdd: () => {
          const controlDiv = L.DomUtil.create('div', 'leaflet-draw-toolbar leaflet-bar');
          this.controlUI = L.DomUtil.create('a', 'leaflet-control-location-off', controlDiv);
          L.DomEvent
            .addListener(controlDiv, 'click', L.DomEvent.stopPropagation)
            .addListener(controlDiv, 'click', L.DomEvent.preventDefault)
            .addListener(controlDiv, 'click', () => {
              this.currentLocation.follow = !this.currentLocation.follow;

              // toggle location icon
              const locationSuffixOld = this.currentLocation.follow ? 'off' : 'on';
              const locationSuffixNew = this.currentLocation.follow ? 'on' : 'off';

              L.DomUtil.removeClass(this.controlUI, `leaflet-control-location-${locationSuffixOld}`);
              L.DomUtil.addClass(this.controlUI, `leaflet-control-location-${locationSuffixNew}`);

              // pan to current location if "following" was triggered
              if (this.currentLocation.follow) {
                this.map.panTo(this.currentLocation.marker.getLatLng());
              }
            });
          return controlDiv;
        }
    });
    const locationControl = new (L.Control as any).Location();
    this.map.addControl(locationControl);

    // always disable following user location, if map was dragged
    this.map.on('mousedown', e => {
      if (this.currentLocation.follow) {
        this.currentLocation.follow = false;

        if (L.DomUtil.hasClass(this.controlUI, 'leaflet-control-location-on')) {
          L.DomUtil.removeClass(this.controlUI, `leaflet-control-location-on`);
          L.DomUtil.addClass(this.controlUI, `leaflet-control-location-off`);
        }
      }
    });
    // invalidate map size after 1 second of initialization for rendering purposes
    setTimeout(() => {
      this.map.invalidateSize(true);
      this.currentLocation.marker.addTo(this.map);
      this.map.setView(this.currentLocation.marker.getLatLng(), this.map.getMaxZoom());
    }, 1000);

    // initialize map service with data and add it to map
    try {
      await this.mapService.initialize();

      this.mapService.getTrashCollection().forEach(report => this.addMarker(report));
      this.applyFilters(false);
    } catch (e) {
      console.error(e);
    }
  }

  private async applyFilters(filterChanged: boolean) {
    console.log('Apply filters: ', this.mapService.getFilters());

    this.markerReports.forEach(markerReport => {
      if (markerReport.enabled) {
        markerReport.marker.remove();
      }
    });

    // retrieve trash reports again from backend
    if (filterChanged) {
      await this.mapService.append();

      this.mapService.getTrashCollection().forEach(report => {
        if (this.markerReports.map(mr => mr.report.id).indexOf(report.id) < 0) {
          this.addMarker(report);
        }
      });
    }

    this.markerReports.forEach(markerReport => {
      markerReport.enabled =
        (this.mapService.getFilters().getTrash()[0] && markerReport.report.hausmuell ||
        this.mapService.getFilters().getTrash()[1] && markerReport.report.gruenabfall ||
        this.mapService.getFilters().getTrash()[2] && markerReport.report.sperrmuell ||
        this.mapService.getFilters().getTrash()[3] && markerReport.report.sondermuell) &&
        (!this.mapService.getFilters().getUsername() || markerReport.report.username === this.mapService.getFilters().getUsername());

      if (markerReport.enabled) {
        markerReport.marker.addTo(this.map).on('click', e => {
          this.selectedPoi = markerReport.report;

          this.currentLocation.follow = false;

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
