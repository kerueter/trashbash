import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Trash } from '../models/Trash';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  endpointUrl: string;

  constructor(private httpClient: HttpClient) {
    this.endpointUrl = 'http://igf-srv-lehre.igf.uni-osnabrueck.de:1338/trash';
  }

  public async listTrash(): Promise<Array<Trash>> {
    try {
      const data = await this.httpClient.get<Array<Trash>>(
        this.endpointUrl
      ).toPromise();

      return data;
    } catch (e) {
      throw e;
    }
  }

  public async postTrash(report: any): Promise<any> {
    try {
      const data = await this.httpClient.post(this.endpointUrl,
        report,
        { headers: { 'Content-Type': 'application/json' } }
      ).toPromise();

      return data;
    } catch (e) {
      throw e;
    }
  }
}
