import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DbExplorer } from './db-explorer';

describe('DbExplorer', () => {
  let component: DbExplorer;
  let fixture: ComponentFixture<DbExplorer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DbExplorer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DbExplorer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
