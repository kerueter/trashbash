import { TestBed } from '@angular/core/testing';

import { DjangoService } from './django.service';

describe('DjangoService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DjangoService = TestBed.get(DjangoService);
    expect(service).toBeTruthy();
  });
});
