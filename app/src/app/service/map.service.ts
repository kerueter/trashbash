import { Injectable } from '@angular/core';
import { Geolocation, Geoposition } from '@ionic-native/geolocation/ngx';

import { ApiService } from './api.service';

import { Trash } from '../models/Trash';
import { Filter } from '../models/Filters';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private trashCollection: Array<Trash>;
  private filters: Filter;
  private userLocationObserver: any;

  constructor(
    private geolocation: Geolocation,
    private apiService: ApiService
  ) {
    // set default date interval filter from today to 14 days ago
    const dateCurrent = new Date();
    const dateLastWeek = new Date(dateCurrent.getTime());
    dateLastWeek.setDate(dateCurrent.getDate() - 14);

    // set default values for filters
    this.filters = new Filter(
      100,
      [true, true, true, true],
      '',
      dateLastWeek.toISOString(),
      dateCurrent.toISOString()
    );
  }

  /**
   * Get all trash reports from API and add to trash collection
   *
   * @param latitude Latitude of the user position
   * @param longitude Longitude of the user position
   */
  async initialize(): Promise<void> {
    try {
      const currentLocation = await this.getUserLocation();
      this.trashCollection = await this.apiService.listTrash(currentLocation.lat, currentLocation.lng, this.filters);
    } catch (e) {
      throw e;
    }
  }

  /**
   * Append trash reports to trash collection
   *
   * @param latitude Latitude of the user position
   * @param longitude Longitude of the user position
   */
  async append(): Promise<void> {
    try {
      const currentLocation = await this.getUserLocation();
      const trashCollectionNew = await this.apiService.listTrash(currentLocation.lat, currentLocation.lng, this.filters);

      // only append new items to trash collection
      trashCollectionNew.forEach(trashNew => {
        if (this.trashCollection.map(m => m.id).indexOf(trashNew.id) < 0) {
          this.trashCollection.push(trashNew);
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Getter for trash collection
   */
  getTrashCollection() {
    return this.trashCollection;
  }

  /**
   * Getter for filters
   */
  getFilters(): Filter {
    return this.filters;
  }

  /**
   * Setter for filters
   *
   * @param filters Filters to set
   */
  setFilters(filters: Filter) {
    this.filters = filters;
  }

  /**
   * Getter for retrieving current user location
   */
  async getUserLocation(): Promise<{lat: number, lng: number}> {
    let data: any;
    try {
      data = await this.geolocation.getCurrentPosition();
    } catch (e) {
      throw new Error('Unable to get current position.');
    }

    this.userLocationObserver = this.geolocation.watchPosition();
    return {
      lat: data.coords.latitude,
      lng: data.coords.longitude
    };
  }

  /**
   * Getter for user location observable
   */
  getUserLocationObserver(): Observable<Geoposition> {
    return this.userLocationObserver;
  }
}
