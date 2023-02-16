import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  distinctUntilChanged,
  map,
  Observable,
  Observer,
  Subscriber,
  TeardownLogic,
} from 'rxjs';
import { ResourceLoaderService } from './resource-loader.service';
import { ResourceInterface, ShopInterface } from './shop-interface';

@Injectable()
export class ShopService {
  private observableStore = new Map<
    string | number,
    { observable: Observable<any>; loadedData: any }
  >();
  constructor(
    private httpClient: HttpClient,
    private resourceLoader: ResourceLoaderService
  ) {}

  getById(id: string | number): Observable<ResourceInterface<ShopInterface>> {
    const existing = this.observableStore.get(id);
    if (existing) {
      return existing.observable;
    }
    const newObservable = this.createNewAsyncShop(id);
    this.observableStore.set(id, newObservable);
    return newObservable.observable;
  }

  private createNewAsyncShop(id: string | number): {
    observable: Observable<ResourceInterface<ShopInterface>>;
    loadedData: ResourceInterface<ShopInterface> | null;
  } {
    return {
      observable: new Observable<ResourceInterface<ShopInterface>>(
        this.multicastSequencer<ResourceInterface<ShopInterface>>(
          this.loadShopData(id)
        )
      ).pipe(
        distinctUntilChanged((prev, current) => this.deepCompare(prev, current))
      ),
      loadedData: null,
    };
  }

  private loadShopData(
    id: string | number
  ): (observer: Observer<ResourceInterface<ShopInterface>>) => void {
    return (observer: Observer<ResourceInterface<ShopInterface>>) => {
      const existing = this.observableStore.get(id);
      if (existing.loadedData) {
        observer.next(existing.loadedData);
        observer.complete();
      } else {
        // TODO implement Worker to make it asynchronous!
        // no data yet
        // 5 hours 5 * 3600 * 1000
        this.resourceLoader
          .getShopById<ShopInterface>(id, {
            subscribable: this.networkLoader(id),
            freshness: 10 * 1000,
          })
          .subscribe({
            next: (resource: ResourceInterface<ShopInterface>) => {
              existing.loadedData = resource;
              observer.next(resource);
            },
            complete: () => {
              observer.complete();
            },
            error: (error) => {
              console.error(error);
              observer.complete();
            },
          });
      }
    };
  }

  private networkLoader(id: string | number): Observable<ShopInterface> {
    return this.httpClient
      .get(
        'https://www.alpinresorts.com/de/service/ski-rental/shops/%shopId%?&currencyCode=EUR'.replace(
          '%shopId%',
          id.toString()
        ),
        { headers: { Accept: 'application/json' }, observe: 'response' }
      )
      .pipe(
        map((response) => {
          //console.log(new Date(response.headers.get('expires')));
          return {
            id: response.body['id'], // 136 | A136
            name: response.body['name'], // Robin's awesome webshop for skis
            adress: response.body['address'], // Austria, 1120 Vienna
            image: response.body['imagePathBig'], // url};
            timestamp: Date.now(), //- 20 * 1000, // now - 20 sec
          };
        })
      );
  }

  private deepCompare(
    a: ResourceInterface<any>,
    b: ResourceInterface<any>
  ): boolean {
    const aKeys = Object.keys(a.data);
    const bKeys = Object.keys(b.data);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    for (let key of Object.keys(a.data)) {
      if (a.data[key] !== b.data[key]) {
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
