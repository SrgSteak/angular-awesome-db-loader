import { Injectable } from '@angular/core';
import {
  distinctUntilChanged,
  Observable,
  Observer,
  Subscriber,
  TeardownLogic,
} from 'rxjs';
import { ResourceLoaderService } from './resource-loader.service';
import { ShopInterface } from './shop-interface';

@Injectable()
export class ShopService {
  private observableStore = new Map<
    string | number,
    { observable: Observable<any>; loadedData: any }
  >();
  constructor(private resourceLoader: ResourceLoaderService) {}

  getById(id: string | number): Observable<ShopInterface> {
    const existing = this.observableStore.get(id);
    if (existing) {
      return existing.observable;
    }
    const newObservable = this.createNewAsyncShop(id);
    this.observableStore.set(id, newObservable);
    return newObservable.observable;
  }

  private createNewAsyncShop(id: string | number): {
    observable: Observable<ShopInterface>;
    loadedData: ShopInterface | null;
  } {
    return {
      observable: new Observable<ShopInterface>(
        this.multicastSequencer<ShopInterface>(this.loadShopData(id))
      ).pipe(
        distinctUntilChanged((prev, current) => this.deepCompare(prev, current))
      ),
      loadedData: null,
    };
  }

  private loadShopData(
    id: string | number
  ): (observer: Observer<ShopInterface>) => void {
    return (observer: Observer<ShopInterface>) => {
      const existing = this.observableStore.get(id);
      if (existing.loadedData) {
        observer.next(existing.loadedData);
        observer.complete();
      } else {
        // TODO
        // const worker = new Worker('ssfasdfa);
        
        // no data yet
        this.resourceLoader.getShopById(id).subscribe(
          (shop: ShopInterface) => {
            existing.loadedData = shop;
            observer.next(shop);
          },
          (error) => {
            observer.complete();
          },
          () => {
            observer.complete();
          }
        );
      }
    };
  }

  private deepCompare(a: ShopInterface, b: ShopInterface): boolean {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    for (let key of Object.keys(a)) {
      if (a[key] !== b[key]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Observable function that will allow multiple subscription handling to same resource in a very
   * fetch conservative manner.
   */
  private multicastSequencer<T>(
    loadData: (observer: Observer<T>) => void
  ): (subscriber: Subscriber<T>) => TeardownLogic {
    // keep track of state
    const observers: Observer<T>[] = [];
    let loaded = false;

    // return Subscriber => TeardownLogic function for new Observable() call;
    return (observer: Subscriber<T>) => {
      observers.push(observer);
      if (observers.length === 1 || loaded) {
        loadData({
          next(value) {
            observers.forEach((observer) => observer.next(value));
            loaded = true;
          },
          error(error) {
            console.error(error);
          },
          complete() {
            observers.forEach((observer) => observer.complete());
          },
        });
      }

      // TeardownLogic
      return () => {
        observers.splice(observers.indexOf(observer), 1);
      };
    };
  }
}
