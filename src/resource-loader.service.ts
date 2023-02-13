import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { map, Observable, tap } from 'rxjs';
import { ShopInterface } from './shop-interface';

@Injectable()
export class ResourceLoaderService {
  private isBrowser: boolean;
  private readonly indexedDBversion = 1;
  private dbopenrequest: IDBOpenDBRequest;
  private objectStore: IDBObjectStore;
  private readonly objectStoreHandle = 'shops';
  private db: IDBDatabase;

  //private transaction: IDBTransaction;

  constructor(
    private httpClient: HttpClient,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.initDB('readwrite');
    }
  }

  getShopById(id: string | number): Observable<ShopInterface> {
    return new Observable((observer) => {
      const uniqueIdentifier = 'shop-' + id;
      const transferKey = makeStateKey<ShopInterface>(uniqueIdentifier);
      if (this.isBrowser) {
        try {
          this.initDB('readonly', null, id);
          /*const req: IDBRequest<ShopInterface> = this.objectStore.get(id);
            console.log(req);
            req.onsuccess = (event: Event) => {
              console.log(req.result);
              observer.next(req.result);
            };
            req.onerror = (event: Event) => {
              console.error(event);
            }; */
          // TODO: null result? what now?
        } catch (e) {
          console.error(e);
        }
        if (this.transferState.hasKey(transferKey)) {
          const shop = this.transferState.get(transferKey, null);
          observer.next(shop);
        }
      }

      // TODO: we always connect to the server! no 'stale' functionality right now
      this.httpClient
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
              timestamp: Date.now(), // now
            };
          }),
          tap((shop) => {
            if (!this.isBrowser) {
              this.transferState.set(transferKey, shop);
            } else {
              this.updateResourceInIDB(shop, id);
            }
          })
        )
        .subscribe((shop) => {
          observer.next(shop);
        });
    });
  }

  private updateResourceInIDB<T>(resource: T, id: string | number) {
    // TODO: store me in db
    console.log('storing to IDB', resource);
    this.openConnection('readwrite');
    const transaction: IDBTransaction = this.db.transaction(
      this.objectStoreHandle,
      'readwrite'
    );
    this.objectStore = transaction.objectStore(this.objectStoreHandle);
    this.objectStore.add(resource);
  }

  private openConnection(type: IDBTransactionMode) {
    console.log('openConnection');
    this.initDB(type);
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
