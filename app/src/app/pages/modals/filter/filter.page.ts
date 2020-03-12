import { Component, OnInit, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { Filters } from 'src/app/models/Filters';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.page.html',
  styleUrls: ['./filter.page.scss'],
})
export class FilterPage implements OnInit {
  @Input() filters: Filters;

  trashes: Array<{ val: string, isChecked: boolean, color: string}>;

  constructor(private modalCtrl: ModalController, private storage: Storage) {
    this.trashes = [
      { val: 'Hausmüll', isChecked: false, color: 'primary' },
      { val: 'Grünabfall', isChecked: false, color: 'success' },
      { val: 'Sperrmüll', isChecked: false, color: 'warning'},
      { val: 'Sondermüll', isChecked: false, color: 'danger' }
    ];
  }

  ngOnInit() {
    this.trashes[0].isChecked = this.filters.trash[0];
    this.trashes[1].isChecked = this.filters.trash[1];
    this.trashes[2].isChecked = this.filters.trash[2];
    this.trashes[3].isChecked = this.filters.trash[3];
  }

  async closeModal() {
    this.filters.trash[0] = this.trashes[0].isChecked;
    this.filters.trash[1] = this.trashes[1].isChecked;
    this.filters.trash[2] = this.trashes[2].isChecked;
    this.filters.trash[3] = this.trashes[3].isChecked;

    // store filters
    await this.storage.set('filter-radius', this.filters.radius);
    await this.storage.set('filter-trash', this.filters.trash);
    await this.storage.set('filter-username', this.filters.username);

    // dismiss modal
    this.modalCtrl.dismiss({
      filters: this.filters
    });
  }
}
