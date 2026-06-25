import { TestBed } from '@angular/core/testing';

import { DbExplorerService } from './db-explorer';

describe('DbExplorerService', () => {
  let service: DbExplorerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DbExplorerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
