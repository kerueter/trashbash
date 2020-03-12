import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Trash } from '../models/Trash';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  endpointUrl: string;

  constructor(private httpClient: HttpClient) {
    this.endpointUrl = 'http://igf-srv-lehre.igf.uni-osnabrueck.de:1338/trash';
  }

  public async listTrash(userLocationLat: number, userLocationLng: number, radiusKm: number): Promise<Array<Trash>> {
    try {
      const data = await this.httpClient.get<Array<Trash>>(`${this.endpointUrl}?userLocationLat=${userLocationLat}&userLocationLng=${userLocationLng}&radiusKm=${radiusKm}`)
      .toPromise();

      return data;
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

  public async postTrashImage(trashImage: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('trashImage', this.dataURItoBlob(trashImage), 'trashImage.jpg');

      const data = await this.httpClient.post(`${this.endpointUrl}/images/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).toPromise();

      return data;
    } catch (e) {
      throw e;
    }
  }

  // https://stackoverflow.com/questions/56835318/picture-upload-in-ionic-4-with-camera-and-file-plugins
  private dataURItoBlob(dataURI: any) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    let byteString: any;
    if (dataURI.split(',')[0].indexOf('base64') >= 0) {
      byteString = atob(dataURI.split(',')[1]);
    } else {
      byteString = unescape(dataURI.split(',')[1]);
    }
    // separate out the mime component
    const mimeString = dataURI
      .split(',')[0]
      .split(':')[1]
      .split(';')[0];
    // write the bytes of the string to a typed array
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], { type: mimeString });
  }

  // TODO: Filter-Anfragen (Radius, Müllarten, Zeitspanne)
}
