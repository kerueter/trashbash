import { Component, OnInit, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Filter } from 'src/app/models/Filters';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.page.html',
  styleUrls: ['./filter.page.scss'],
})
export class FilterPage implements OnInit {
  @Input() filter: Filter;

  filterValues: any;

  /**
   * Constructor of the filter modal page
   *
   * @param modalCtrl
   * @param toastCtrl
   */
  constructor(private modalCtrl: ModalController, private toastCtrl: ToastController) {
  }

  /**
   *
   */
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

  /**
   * Function to close the filter modal and pass data to map page
   */
  async closeModal() {
    // fix weird error where time zone offset is added for each new filter application
    const startDate = new Date(this.filterValues.startDate);
    const endDate = new Date(this.filterValues.endDate);
    startDate.setHours(0);
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    if (endDate.getUTCHours() !== 23 || endDate.getUTCMinutes() !== 59 || endDate.getUTCMinutes() !== 59) {
      endDate.setMinutes(endDate.getTimezoneOffset());
      this.filterValues.endDate = endDate.toISOString();
    }

    // format start and end date to ISO formatted timestamp
    if (this.filterValues.startDate[this.filterValues.startDate.length - 1] !== 'Z') {
      this.filterValues.startDate = this.filterValues.startDate.substring(0, this.filterValues.startDate.length - 6);
      this.filterValues.startDate += 'Z';
    }
    if (this.filterValues.endDate[this.filterValues.endDate.length - 1] !== 'Z') {
      this.filterValues.endDate = this.filterValues.endDate.substring(0, this.filterValues.endDate.length - 6);
      this.filterValues.endDate += 'Z';
    }

    // create toast
    const toast = await this.toastCtrl.create({
      message: 'Die Filter wurden angewendet.',
      duration: 2000
    });
    toast.present();

    // dismiss modal
    this.modalCtrl.dismiss({
      filter: this.filterValues
    });
  }
}
