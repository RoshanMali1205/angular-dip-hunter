import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  IndependenceDayFlagComponent,
  INDEPENDENCE_DAY_EOD_IST,
} from './independence-day-flag.component';

describe('IndependenceDayFlagComponent', () => {
  let fixture: ComponentFixture<IndependenceDayFlagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndependenceDayFlagComponent],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the Indian flag before Independence Day EOD IST', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-15T18:00:00+05:30'));

    fixture = TestBed.createComponent(IndependenceDayFlagComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.independence-flag')).toBeTruthy();
    expect(el.querySelector('[aria-label="Happy Independence Day India"]')).toBeTruthy();
  });

  it('hides the flag after Independence Day EOD IST', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(INDEPENDENCE_DAY_EOD_IST.getTime() + 1));

    fixture = TestBed.createComponent(IndependenceDayFlagComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.independence-flag')).toBeNull();
  });

  it('auto-hides when the EOD deadline is reached while mounted', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(INDEPENDENCE_DAY_EOD_IST.getTime() - 5_000));

    fixture = TestBed.createComponent(IndependenceDayFlagComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.independence-flag')).toBeTruthy();

    vi.advanceTimersByTime(5_001);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.independence-flag')).toBeNull();
  });
});
