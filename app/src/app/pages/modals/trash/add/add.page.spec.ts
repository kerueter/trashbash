import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { TrashAddPage } from './add.page';

describe('TrashAddPage', () => {
  let component: TrashAddPage;
  let fixture: ComponentFixture<TrashAddPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TrashAddPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TrashAddPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
