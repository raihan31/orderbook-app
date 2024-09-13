import { TestBed, ComponentFixture } from '@angular/core/testing';
import { OrderbookComponent } from './orderbook.component';
import { WebSocketService } from '../../services/websocket.service';
import { Subject } from 'rxjs';

describe('OrderbookComponent', () => {
  let component: OrderbookComponent;
  let fixture: ComponentFixture<OrderbookComponent>;
  let websocketServiceSpy: jasmine.SpyObj<WebSocketService>;
  let mockSubject: Subject<any>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('WebSocketService', ['connect', 'disconnect', 'close']);

    mockSubject = new Subject<any>();

    await TestBed.configureTestingModule({
      declarations: [],
      imports: [OrderbookComponent],
      providers: [{ provide: WebSocketService, useValue: spy }]
    }).compileComponents();

    websocketServiceSpy = TestBed.inject(WebSocketService) as jasmine.SpyObj<WebSocketService>;
    websocketServiceSpy.connect.and.returnValue(mockSubject);

    fixture = TestBed.createComponent(OrderbookComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should connect to the WebSocket on init', () => {
    expect(websocketServiceSpy.connect).toHaveBeenCalledWith('PI_XBTUSD');
  });

  it('should handle WebSocket data for buy orders', () => {
    const mockData = { bids: [[50000, 1]] };
    mockSubject.next(mockData);
    fixture.detectChanges();

    expect(component.buyOrders.length).toBe(1);
    expect(component.buyOrders[0].price).toBe(50000);
    expect(component.buyOrders[0].size).toBe(1);
  });

  it('should handle WebSocket data for sell orders', () => {
    const mockData = { asks: [[51000, 2]] };
    mockSubject.next(mockData);
    fixture.detectChanges();

    expect(component.sellOrders.length).toBe(1);
    expect(component.sellOrders[0].price).toBe(51000);
    expect(component.sellOrders[0].size).toBe(2);
  });

  it('should sort buy orders in descending order', () => {
    const mockData = { bids: [[50000, 1], [60000, 2]] };
    mockSubject.next(mockData);
    fixture.detectChanges();

    expect(component.buyOrders[0].price).toBe(60000);
    expect(component.buyOrders[1].price).toBe(50000);
  });

  it('should sort sell orders in descending order', () => {
    const mockData = { asks: [[51000, 1], [52000, 2]] };
    mockSubject.next(mockData);
    fixture.detectChanges();

    expect(component.sellOrders[0].price).toBe(52000);
    expect(component.sellOrders[1].price).toBe(51000);
  });

  it('should toggle between feeds correctly', () => {
    component.toggleFeed();
    expect(websocketServiceSpy.disconnect).toHaveBeenCalledWith('PI_XBTUSD');
    expect(websocketServiceSpy.connect).toHaveBeenCalledWith('PI_ETHUSD');

    component.toggleFeed();
    expect(websocketServiceSpy.disconnect).toHaveBeenCalledWith('PI_ETHUSD');
    expect(websocketServiceSpy.connect).toHaveBeenCalledWith('PI_XBTUSD');
  });

  it('should kill and restart the WebSocket feed', () => {
    component.killFeed();
    expect(websocketServiceSpy.close).toHaveBeenCalled();
    expect(component.feedKilled).toBe(true);

    component.killFeed();
    expect(websocketServiceSpy.connect).toHaveBeenCalledWith('PI_XBTUSD');
    expect(component.feedKilled).toBe(false);
  });

  it('should update grouping correctly when switching product', () => {
    expect(component.grouping).toBe(0.5);

    component.toggleFeed();
    expect(component.grouping).toBe(0.05);
  });

  it('should remove orders when size is 0', () => {
    const mockData = { bids: [[50000, 1]] };
    mockSubject.next(mockData);
    fixture.detectChanges();

    expect(component.buyOrders.length).toBe(1);

    const updateData = { bids: [[50000, 0]] };
    mockSubject.next(updateData);
    fixture.detectChanges();

    expect(component.buyOrders.length).toBe(0);
  });

  it('should correctly calculate totals', () => {
    const mockData = { bids: [[50000, 1], [49000, 2]] };
    mockSubject.next(mockData);
    fixture.detectChanges();

    expect(component.buyOrders[0].total).toBe(3);
    expect(component.buyOrders[1].total).toBe(1);
  });
});
