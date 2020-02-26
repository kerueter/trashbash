import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DjangoService {
  url = 'https://api.emissions-api.org/api/v1/average.json?country=DE&begin=2019-02-01&end=2019-03-01';
  results: any;

  constructor(public http: HttpClient) { }

  public getData() {
    return this.http.get(this.url);
  }
}
