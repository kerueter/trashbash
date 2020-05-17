import { Component, ViewChild, OnInit, ElementRef, Renderer2 } from '@angular/core';
import { GestureController, ModalController, LoadingController } from '@ionic/angular';

import { Map, tileLayer, Marker, icon } from 'leaflet';
import * as L from 'leaflet';

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
  markerGroup: any;
  selectedPoi?: Trash;

  private currentLocation: { marker: Marker, follow: boolean };
  private controlUI;
  private isMapServiceInitialized;

  /**
   * Constructor for the map page component
   *
   * @param gestureCtrl
   * @param renderer
   * @param modalCtrl
   * @param loadingCtrl
   * @param mapService
   */
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
    this.isMapServiceInitialized = false;
  }

  /**
   * Ionic/Angular initialize lifecycle method
   */
  async ngOnInit() {
    // present loading spinner while initalizing map
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

    // dismiss loading spinner after initialization
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

    this.isMapInBackground = true; // for scale effect of modal

    // apply filters after filter modal was closed
    // only apply filters, if filters changed
    modal.onDidDismiss().then(result => {
      const modalFilter = new Filter(
        result.data.filter.radius,
        result.data.filter.trash.map(m => m.isChecked),
        result.data.filter.username,
        result.data.filter.startDate,
        result.data.filter.endDate
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
      componentProps: {
        userLocation: this.currentLocation.marker.getLatLng()
      },
      cssClass: 'trash-modal',
      swipeToClose: false
    });

    this.isMapInBackground = true;

    modal.onDidDismiss().then(result => {
      this.isMapInBackground = false;
      if (result.data.report) {
        this.addMarker(result.data.report);
        this.applyFilters(false);
      }
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
      iconUrl: this.getTrashMarkerIcon(report),
      iconSize: [40, 40],
    });
    this.markerReports.push({
      marker: new Marker([report.latitude, report.longitude], { icon: trashLocationIcon, zIndexOffset: 1 }),
      report,
      enabled: true
    });
  }

  /**
   * Get marker icon based on trash in report
   *
   * @param report Trash report
   */
  private getTrashMarkerIcon(report: Trash): string {
    let iconSuffix = '';

    if (report.hausmuell) {
      iconSuffix += '-1';
    }
    if (report.gruenabfall) {
      iconSuffix += '-2';
    }
    if (report.sperrmuell) {
      iconSuffix += '-3';
    }
    if (report.sondermuell) {
      iconSuffix += '-4';
    }

    return `../../assets/icon/location-trash${iconSuffix}.svg`;
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

    // close slider menu, if dragged down to (1/3) of height, otherwise "jump" back to original size
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

    if (newOffsetY <= 0) { // only shift positive Y offset
      this.renderer.setStyle(this.mapMenu.nativeElement, 'bottom', newOffsetY + 'px');
    }
  }

  /**
   * Initialite leaflet map and locator
   */
  private async initializeMap() {
    // set static user location and set marker for initialization
    const userLocationIcon = icon({
      iconUrl: '../../assets/icon/location_my.svg',
      iconSize: [40, 40],
    });
    this.currentLocation = {
      marker: new Marker([52, 8], { icon: userLocationIcon }),
      follow: true
    };

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

    // extend leaflet controls with "location follow" toggler
    (L.Control as any).Location = L.Control.extend(
    {
        options: { position: 'topleft' },
        onAdd: () => {
          const controlDiv = L.DomUtil.create('div', 'leaflet-draw-toolbar leaflet-bar');
          this.controlUI = L.DomUtil.create('a', 'leaflet-control-location-on', controlDiv);
          L.DomEvent
            .addListener(controlDiv, 'click', L.DomEvent.stopPropagation)
            .addListener(controlDiv, 'click', L.DomEvent.preventDefault)
            .addListener(controlDiv, 'click', () => {
              // toggle follow status of user
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

    // setup subscriber for user location and initialize map service with data and add it to map
    this.mapService.initialize();
    this.mapService.getUserLocationObserver().subscribe(async locationData => {
      this.currentLocation.marker.setLatLng([
        locationData.coords.latitude, locationData.coords.longitude
      ]);

      if (this.currentLocation.follow) {
        this.map.flyTo(this.currentLocation.marker.getLatLng());
      }

      // only initialize map service, if the first location of subscriber was received
      if (!this.isMapServiceInitialized) {
        try {
          await this.mapService.initializeTrashCollection(this.currentLocation.marker.getLatLng());

          // add markers from trash collection
          this.mapService.getTrashCollection().forEach(report => this.addMarker(report));
          this.applyFilters(false);

          this.isMapServiceInitialized = true;
        } catch (msErr) {
          console.error(msErr);
        }
      }
    });
  }

  private async applyFilters(filterChanged: boolean) {
    console.log('Apply filters: ', this.mapService.getFilters());
    console.log(`Filter was ${filterChanged ? '' : 'not '}changed.`);

    // retrieve trash reports again from backend
    if (filterChanged) {
      // first remove existing markers from map, if enabled
      this.markerReports.forEach(markerReport => {
        if (markerReport.enabled) {
          markerReport.marker.remove();
        }
      });

      // append trash collection in map service based on user location and current filters
      await this.mapService.append(this.currentLocation.marker.getLatLng());

      // only add marker, if not already added to marker reports (no duplicates)
      this.mapService.getTrashCollection().forEach(report => {
        if (this.markerReports.map(mr => mr.report.id).indexOf(report.id) < 0) {
          this.addMarker(report);
        }
      });
    }

    const currentLatLng = this.currentLocation.marker.getLatLng();
    this.markerReports.forEach(markerReport => {
      // get filter status for reports
      const filterTrash = (
        this.mapService.getFilters().getTrash()[0] && markerReport.report.hausmuell ||
        this.mapService.getFilters().getTrash()[1] && markerReport.report.gruenabfall ||
        this.mapService.getFilters().getTrash()[2] && markerReport.report.sperrmuell ||
        this.mapService.getFilters().getTrash()[3] && markerReport.report.sondermuell
      );
      const filterUsername = (!this.mapService.getFilters().getUsername()) || (markerReport.report.username === this.mapService.getFilters().getUsername());
      const filterDate =
        new Date(this.mapService.getFilters().getStartDate()).getTime() < new Date(markerReport.report.time).getTime() &&
        new Date(this.mapService.getFilters().getEndDate()).getTime() > new Date(markerReport.report.time).getTime();

      const filterRadius = (this.getTrashDistance(
        { latitude: currentLatLng.lat, longitude: currentLatLng.lng}, { latitude: markerReport.report.latitude, longitude: markerReport.report.longitude}
      ) <= this.mapService.getFilters().getRadius());

      // set marker report to enabled, if it "passes" through all active filters
      markerReport.enabled = filterTrash && filterUsername && filterDate && filterRadius;
      if (markerReport.enabled) {
        this.addMarkerToMap(markerReport);
      }
    });
  }

  /**
   * Add a marker report to the leaflet map
   *
   * @param markerReport Marker report object
   */
  private addMarkerToMap(markerReport: any) {
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

  /**
   * Get the distance of the trash location to the radius center (in km)
   *
   * @param center Geo location of the radius center
   * @param marker Geo location of the trash marker
   */
  private getTrashDistance(center, marker) {
    const ky = 40000 / 360;
    const kx = Math.cos(Math.PI * center.latitude / 180.0) * ky;
    const dx = Math.abs(center.longitude - marker.longitude) * kx;
    const dy = Math.abs(center.latitude - marker.latitude) * ky;

    return Math.sqrt(dx * dx + dy * dy);
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
