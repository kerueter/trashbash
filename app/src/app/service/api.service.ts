import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { FileTransfer, FileTransferObject, FileUploadOptions } from '@ionic-native/file-transfer/ngx';

import { FeatureCollection, Feature, Point } from 'geojson';
import { Trash } from '../models/Trash';
import { Filter } from '../models/Filters';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  endpointUrl: string;

  /**
   * Constructor of the API service
   *
   * @param httpClient
   * @param transfer
   */
  constructor(
    private httpClient: HttpClient,
    private transfer: FileTransfer
  ) {
    this.endpointUrl = 'http://igf-srv-lehre.igf.uni-osnabrueck.de:1338';
  }

  /**
   * GET list of trash reports, parse and return parsed list
   *
   * @param userLocationLat Latitude of the current user location
   * @param userLocationLng Longitude of the current user location
   * @param filter Filters to apply
   */
  public async listTrash(userLocationLat: number, userLocationLng: number, filter: Filter): Promise<Array<Trash>> {
    console.log(`GET Trash with radius: ${filter.getRadius()}, start date: ${filter.getStartDate()}, end date: ${filter.getEndDate()}`);

    try {
      const data = await this.httpClient.get<FeatureCollection>(
        `${this.endpointUrl}/trash` +
        `?userLocationLat=${userLocationLat}` +
        `&userLocationLng=${userLocationLng}` +
        `&radiusKm=${filter.getRadius()}` +
        `&startDate=${filter.getStartDate()}` +
        `&endDate=${filter.getEndDate()}`
      ).toPromise();

      const trashList = new Array<Trash>();
      data.features.forEach(feature => {
        trashList.push({
          id: feature.properties.id,
          time: feature.properties.time,
          username: feature.properties.username,
          latitude: (feature.geometry as Point).coordinates[1],
          longitude: (feature.geometry as Point).coordinates[0],
          hausmuell: feature.properties.hausmuell,
          gruenabfall: feature.properties.gruenabfall,
          sperrmuell: feature.properties.sperrmuell,
          sondermuell: feature.properties.sondermuell,
          photo: feature.properties.photo && feature.properties.photo.length > 0 ?
            feature.properties.photo : null
        });
      });

      console.log('Got trash from API.');

      return trashList;
    } catch (e) {
      throw e;
    }
  }

  /**
   * POST trash report to backend
   *
   * @param report Report to send to backend
   */
  public async postTrash(report: any): Promise<Trash> {
    try {
      const feature = await this.httpClient.post<Feature>(`${this.endpointUrl}/trash`, report, {
        headers: { 'Content-Type': 'application/json' }
      }).toPromise();

      return {
        id: feature.properties.id,
        time: feature.properties.time,
        username: feature.properties.username,
        latitude: (feature.geometry as Point).coordinates[1],
        longitude: (feature.geometry as Point).coordinates[0],
        hausmuell: feature.properties.hausmuell,
        gruenabfall: feature.properties.gruenabfall,
        sperrmuell: feature.properties.sperrmuell,
        sondermuell: feature.properties.sondermuell,
        photo: feature.properties.photo && feature.properties.photo.length > 0 ?
          feature.properties.photo : null
      };
    } catch (e) {
      throw e;
    }
  }

  /**
   * Separate POST endpoint to post "binary" trash image
   *
   * @param filePath Local file path of the image
   */
  public async postTrashImage(filePath: string): Promise<any> {
    const fileTransfer: FileTransferObject = this.transfer.create();
    try {
      const options: FileUploadOptions = {
        fileKey: 'file',
        fileName: 'image.jpg',
        chunkedMode: false,
        httpMethod: 'post',
        mimeType: 'image/jpeg',
      };
      const res = await fileTransfer.upload(
        filePath, `${this.endpointUrl}/trash/images/upload`, options
      );
      return res;
    } catch (e) {
      throw e;
    }
  }
}
