import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import {
  makeStateKey,
  StateKey,
  TransferState,
} from '@angular/platform-browser';
import { Observable, Subscriber, tap } from 'rxjs';
import {
  ResourceEntityInterface,
  ResourceInterface,
  ResourceOrigin,
  TimeStampInterface,
} from './shop-interface';

/**
 * Configuration for the resource loader behavior
 * @param stale default true. If stale/db data is sufficient or network loader data should always be pulled
 */
export interface ResourceConfiguration {
  stale: boolean;
}

@Injectable()
export class ResourceLoaderService {
  private readonly objectStoreHandle = 'shops';
  private readonly indexedDBversion = 1;
  private isBrowser: boolean;

  constructor(
    private transferState: TransferState,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  getResourceById<T extends TimeStampInterface>(
    id: string | number,
    networkLoader?: { subscribable: Observable<T>; freshness?: number },
    resourceOptions = { stale: true }
  ): Observable<ResourceInterface<T>> {
    return new Observable((observer) => {
      const transferKey = makeStateKey<T>(id.toString());
      // we run in the clients browser. Pull order: transferkey -> idb -> networkLoader
      if (this.isBrowser) {
        if (this.transferState.hasKey(transferKey)) {
          const shop = this.transferState.get(transferKey, null);
          observer.next({ data: shop, origin: ResourceOrigin.transferstate });
        } else {
          console.log(
            'could not pull data from ',
            ResourceOrigin.transferstate
          );
        }
        try {
          this.getObjectStore(this.objectStoreHandle, 'readonly', {
            version: this.indexedDBversion,
            onUpgradeNeededCallback: () => {},
          }).subscribe((objectStore) => {
            const result = objectStore.get(id);
            result.onsuccess = (event: Event) => {
              const shop = result.result as T;
              if (shop) {
                console.log('read IDB:', shop);
                observer.next({ data: shop, origin: ResourceOrigin.idb });
                console.log(
                  'comparing:',
                  new Date(Date.now() - networkLoader.freshness),
                  new Date(shop.timestamp),
                  Date.now() - networkLoader.freshness - shop.timestamp
                );
                if (
                  networkLoader &&
                  Date.now() - networkLoader.freshness > shop.timestamp
                ) {
                  this.pullFromNetworkLoader(networkLoader, observer);
                }
              } else {
                // no shop in db
                // TODO: we always connect to the server! no 'stale' functionality right now
                if (networkLoader) {
                  this.pullFromNetworkLoader(networkLoader, observer);
                }
              }
            };
            result.onerror = (event: Event) => {
              console.error('error accessing idb.', event);
            };
          });
          // TODO: null result? what now?
        } catch (e) {
          console.error(e);
        }
      } else {
        // SSR
        this.pullFromNetworkLoader(networkLoader, observer, transferKey);
      }
    });
  }

  /**
   * pull and set data either in idb or transferstate and send data to observers
   * @param networkLoader <- the networkloader function your service provides
   * @param observer <- the subscribers to your Observable. They want the data from the network loader
   * @param transferKey <- the transferKey in your SSR flow. This data will be pulled from the page in the client side run
   */
  private pullFromNetworkLoader<T extends TimeStampInterface>(
    networkLoader: { subscribable: Observable<T>; freshness?: number },
    observer: Subscriber<ResourceInterface<T>>,
    transferKey?: StateKey<T>
  ) {
    networkLoader.subscribable
      .pipe(
        tap((data) => {
          if (transferKey) {
            this.transferState.set(transferKey, data);
          } else {
            this.updateResourceInIDB(data);
          }
        })
      )
      .subscribe((data) => {
        observer.next({
          data: data,
          origin: ResourceOrigin.network,
        });
      });
  }

  private updateResourceInIDB<T extends TimeStampInterface>(resource: T) {
    resource.timestamp = Date.now();
    console.log('write IDB:', resource);
    this.getObjectStore(this.objectStoreHandle, 'readwrite', {
      version: this.indexedDBversion,
      onUpgradeNeededCallback: () => {},
    }).subscribe((objectStore) => {
      objectStore.put(resource);
    });
  }

  /**
   * 90% boilerplate to get read/write access to the IDB in your browser.
   */
  private getObjectStore(
    store: string,
    mode: IDBTransactionMode,
    configuration: ResourceEntityInterface
  ): Observable<IDBObjectStore> {
    const sub = new Observable<IDBObjectStore>((subscriber) => {
      const dbOpenRequest = window.indexedDB.open(store, configuration.version);
      dbOpenRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        console.info(
          `shop db requires update/setup. ld version: ${event.oldVersion}, new version: ${event.newVersion}`
        );
        const db = dbOpenRequest.result;
        db.onerror = (event: Event) => {
          console.error('db setup encountered error, aborting', event);
          subscriber.error(event);
          subscriber.complete();
        };
        const objectStore = db.createObjectStore(store, {
          keyPath: 'id',
        });
        // TODO: let onUpgradeNeededCallback handle this
        configuration.onUpgradeNeededCallback(objectStore);
        objectStore.createIndex('name', 'name', { unique: false });
        objectStore.createIndex('adress', 'adress', { unique: false });
        objectStore.createIndex('image', 'image', { unique: false });
      };
      dbOpenRequest.onsuccess = (event: Event) => {
        subscriber.next(
          dbOpenRequest.result.transaction(store, mode).objectStore(store)
        );
        subscriber.complete();
      };
    });
    return sub;
  }
}
