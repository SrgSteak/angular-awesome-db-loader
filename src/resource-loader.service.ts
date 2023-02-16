import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { map, Observable, tap } from 'rxjs';
import {
  ResourceInterface,
  ResourceOrigin,
  ShopInterface,
  TimeStampInterface,
} from './shop-interface';

@Injectable()
export class ResourceLoaderService {
  private readonly objectStoreHandle = 'shops';
  private readonly indexedDBversion = 1;
  private isBrowser: boolean;
  private dbopenrequest: IDBOpenDBRequest;
  private objectStore: IDBObjectStore;
  private db: IDBDatabase;

  constructor(
    private transferState: TransferState,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  getShopById<T extends TimeStampInterface>(
    id: string | number,
    networkLoader?: { subscribable: Observable<T>; freshness?: number }
  ): Observable<ResourceInterface<T>> {
    return new Observable((observer) => {
      const uniqueIdentifier = 'shop-' + id;
      const transferKey = makeStateKey<T>(uniqueIdentifier);
      if (this.isBrowser) {
        try {
          this.getObjectStore(
            this.objectStoreHandle,
            'readonly',
            this.indexedDBversion
          ).subscribe((objectStore) => {
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
                  networkLoader.subscribable
                    .pipe(
                      tap((data) => {
                        if (!this.isBrowser) {
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
              } else {
                // no shop in db
                // TODO: we always connect to the server! no 'stale' functionality right now
                if (networkLoader) {
                  networkLoader.subscribable
                    .pipe(
                      tap((data) => {
                        if (!this.isBrowser) {
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
        // TODO: move me higher in the chain!
        if (this.transferState.hasKey(transferKey)) {
          const shop = this.transferState.get(transferKey, null);
          observer.next({ data: shop, origin: ResourceOrigin.transferstate });
        }
      }
    });
  }

  private updateResourceInIDB<T extends TimeStampInterface>(resource: T) {
    // TODO: store me in db
    resource.timestamp = Date.now();
    console.log('write IDB:', resource);
    this.getObjectStore(
      this.objectStoreHandle,
      'readwrite',
      this.indexedDBversion
    ).subscribe((objectStore) => {
      objectStore.add(resource);
    });
    /* this.openConnection('readwrite');
    const transaction: IDBTransaction = this.db.transaction(
      this.objectStoreHandle,
      'readwrite'
    );
    this.objectStore = transaction.objectStore(this.objectStoreHandle);
    this.objectStore.add(resource); */
  }

  private openConnection(type: IDBTransactionMode) {
    console.log('openConnection');
    this.initDB(type);
  }

  private getObjectStore(
    store: string,
    mode: IDBTransactionMode,
    version?: number
  ): Observable<IDBObjectStore> {
    const sub = new Observable<IDBObjectStore>((subscriber) => {
      const dbOpenRequest = window.indexedDB.open(store, version);
      dbOpenRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        console.info(
          `shop db requires update/setup. ld version: ${event.oldVersion}, new version: ${event.newVersion}`
        );
        this.db = dbOpenRequest.result;
        this.db.onerror = (event: Event) => {
          console.error('db setup encountered error, aborting', event);
          subscriber.error(event);
          subscriber.complete();
        };
        this.db.createObjectStore(store, {
          keyPath: 'id',
        });
        this.objectStore.createIndex('name', 'name', { unique: false });
        this.objectStore.createIndex('adress', 'adress', { unique: false });
        this.objectStore.createIndex('image', 'image', { unique: false });
      };
      dbOpenRequest.onsuccess = (event: Event) => {
        this.db = dbOpenRequest.result;
        subscriber.next(this.db.transaction(store, mode).objectStore(store));
        subscriber.complete();
      };
    });
    return sub;
  }

  private initDB(
    type: IDBTransactionMode,
    write?: ShopInterface,
    read?: string | number
  ) {
    this.dbopenrequest = window.indexedDB.open(
      this.objectStoreHandle,
      this.indexedDBversion
    );
    this.dbopenrequest.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      console.group();
      console.info(
        `shop db requires update/setup. ld version: ${event.oldVersion}, new version: ${event.newVersion}`
      );
      console.log(typeof event.target);
      this.db = (event.target as any).result; // TODO: get correct type;
      this.db.onerror = (event) => {
        console.error('db setup encountered error, aborting', event);
      };

      this.objectStore = this.db.createObjectStore(this.objectStoreHandle, {
        keyPath: 'id',
      });
      this.objectStore.createIndex('name', 'name', { unique: false });
      this.objectStore.createIndex('adress', 'adress', { unique: false });
      this.objectStore.createIndex('image', 'image', { unique: false });

      console.groupEnd();
    };
    this.dbopenrequest.onsuccess = (event: Event) => {
      this.db = this.dbopenrequest.result; // ich lebe lang
      const transaction: IDBTransaction = this.db.transaction(
        // ich lebe kurz
        this.objectStoreHandle,
        'readwrite'
      );
      this.objectStore = transaction.objectStore(this.objectStoreHandle);
      if (write) {
        this.objectStore.add(write);
      }
      if (read) {
        const req = this.objectStore.get(read);
        req.onsuccess = (event: Event) => {
          console.log('read from db:', req.result);
        };
      }
    };
  }
}
