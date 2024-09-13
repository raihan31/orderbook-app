import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebSocketService } from '../../services/websocket.service';
import { Subject } from 'rxjs';
import {CommonModule} from "@angular/common";

interface Order {
  price: number;
  size: number;
  total: number;
}

@Component({
  selector: 'app-orderbook',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orderbook.component.html',
  styleUrls: ['./orderbook.component.scss']
})
export class OrderbookComponent implements OnInit, OnDestroy {
  buyOrders: Order[] = [];
  sellOrders: Order[] = [];
  productId: string = 'PI_XBTUSD';
  grouping: number = 0.5;
  private subject: Subject<any>;
  feedKilled: boolean = false;

  constructor(private websocketService: WebSocketService) {}

  ngOnInit(): void {
    this.connectWebSocket(this.productId);
  }

  connectWebSocket(productId: string): void {
    this.subject = this.websocketService.connect(productId);

    this.subject.subscribe({
      next: (data: any) => this.handleData(data),
      error: (err: any) => console.error('WebSocket error', err),
      complete: () => console.log('WebSocket connection closed')
    });
  }

  handleData(data: any): void {
    if (data.bids) {
      this.updateOrderbook(data.bids, 'buy');
    }
    if (data.asks) {
      this.updateOrderbook(data.asks, 'sell');
    }
  }

  updateOrderbook(data: [number, number][], side: 'buy' | 'sell'): void {
    const orders = side === 'buy' ? this.buyOrders : this.sellOrders;
    data.forEach(([price, size]) => {
      const groupedPrice = Math.floor(price / this.grouping) * this.grouping;
      const existingOrder = orders.find(order => order.price === groupedPrice);
      if (size === 0) {
        this.removeOrder(groupedPrice, side);
      } else if (existingOrder) {
        existingOrder.size = size;
      } else {
        orders.push({ price: groupedPrice, size, total: 0 });
      }
      this.calculateTotal(orders);
    });
  }

  removeOrder(price: number, side: 'buy' | 'sell'): void {
    const orders = side === 'buy' ? this.buyOrders : this.sellOrders;
    const index = orders.findIndex(order => order.price === price);
    if (index !== -1) {
      orders.splice(index, 1);
    }
  }

  calculateTotal(orders: Order[]): void {

    let runningTotal = 0;
    orders.forEach(order => {
      runningTotal += order.size;
      order.total = runningTotal;
    });
    orders.sort((a, b) => b.total - a.total);
  }

  changeGrouping(grouping: number): void {
    this.grouping = Number(grouping);
    this.resetOrderbook();
  }

  getGroupingOptions(): number[] {
    if (this.productId === 'PI_XBTUSD') {
      return [0.5, 1, 2.5];
    } else if (this.productId === 'PI_ETHUSD') {
      return [0.05, 0.1, 0.25];
    }
    return [];
  }

  resetOrderbook(): void {
    this.buyOrders = [];
    this.sellOrders = [];
  }

  toggleFeed(): void {
    this.websocketService.disconnect(this.productId);

    this.productId = this.productId === 'PI_XBTUSD' ? 'PI_ETHUSD' : 'PI_XBTUSD';
    this.grouping = this.productId === 'PI_XBTUSD' ? 0.5 : 0.05;
    this.websocketService.connect(this.productId);
    this.resetOrderbook();
  }

  killFeed(): void {
    if (!this.feedKilled) {
      this.websocketService.close();  // Kill feed
    } else {
      this.connectWebSocket(this.productId);  // Restart feed
    }
    this.feedKilled = !this.feedKilled;
  }

  ngOnDestroy(): void {
    this.websocketService.close();
  }
}
