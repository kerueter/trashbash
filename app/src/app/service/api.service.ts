import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { FileTransfer, FileTransferObject, FileUploadOptions } from '@ionic-native/file-transfer/ngx';

import { FeatureCollection, Point } from 'geojson';
import { Trash } from '../models/Trash';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  endpointUrl: string;

  constructor(
    private httpClient: HttpClient,
    private transfer: FileTransfer
  ) {
    this.endpointUrl = 'http://igf-srv-lehre.igf.uni-osnabrueck.de:1338/trash';
  }

  public async listTrash(userLocationLat: number, userLocationLng: number, radiusKm: number): Promise<Array<Trash>> {
    try {
      const data = await this.httpClient.get<FeatureCollection>(`${this.endpointUrl}?userLocationLat=${userLocationLat}&userLocationLng=${userLocationLng}&radiusKm=${radiusKm}`)
      .toPromise();

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
          photo: feature.properties.photo || null
        });
      });

      return trashList;
    } catch (e) {
      throw e;
    }
  }

  public async postTrash(report: any): Promise<any> {
    try {
      const data = await this.httpClient.post(this.endpointUrl, report, {
        headers: { 'Content-Type': 'application/json' }
      }).toPromise();

      return data;
    } catch (e) {
      throw e;
    }
  }

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
        filePath, `${this.endpointUrl}/images/upload`, options
      );
      return res;
    } catch (e) {
      throw e;
    }
  }

  // TODO: Filter-Anfragen (Radius, Müllarten, Zeitspanne)
}
