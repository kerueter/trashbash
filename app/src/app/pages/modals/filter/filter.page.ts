import { Component, OnInit, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Filter } from 'src/app/models/Filters';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.page.html',
  styleUrls: ['./filter.page.scss'],
})
export class FilterPage implements OnInit {
  @Input() filter: Filter;

  filterValues: any;

  constructor(private modalCtrl: ModalController) {
  }

  ngOnInit() {
    this.filterValues = {
      radius: this.filter.getRadius(),
      trash: [
        { val: 'Hausmüll', isChecked: this.filter.getTrash()[0], color: 'primary' },
        { val: 'Grünabfall', isChecked: this.filter.getTrash()[1], color: 'success' },
        { val: 'Sperrmüll', isChecked: this.filter.getTrash()[2], color: 'warning'},
        { val: 'Sondermüll', isChecked: this.filter.getTrash()[3], color: 'danger' }
      ],
      username: this.filter.getUsername(),
      startDate: this.filter.getStartDate(),
      endDate: this.filter.getEndDate()
    };
  }

  async closeModal() {
    if (this.filterValues.startDate[this.filterValues.startDate.length - 1] !== 'Z') {
      this.filterValues.startDate = this.filterValues.startDate.substring(0, this.filterValues.startDate.length - 6);
      this.filterValues.startDate += 'Z';
    }
    if (this.filterValues.endDate[this.filterValues.endDate.length - 1] !== 'Z') {
      this.filterValues.endDate = this.filterValues.endDate.substring(0, this.filterValues.endDate.length - 6);
      this.filterValues.endDate += 'Z';
    }

    // dismiss modal
    this.modalCtrl.dismiss({
      filter: this.filterValues
    });
  }
}
