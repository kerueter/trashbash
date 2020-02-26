import { Component, OnInit } from '@angular/core';
import { DjangoService } from '../../service/django.service';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss']
})
export class SettingsPage implements OnInit {
  data: any;

  constructor(private djangoService: DjangoService) {}

  ngOnInit() {
    this.djangoService.getData().subscribe((res: any) => {
      this.data = res;
    });
  }
}
