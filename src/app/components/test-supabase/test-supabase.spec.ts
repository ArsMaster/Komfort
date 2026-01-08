import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestSupabase } from './test-supabase';

describe('TestSupabase', () => {
  let component: TestSupabase;
  let fixture: ComponentFixture<TestSupabase>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestSupabase]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestSupabase);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
