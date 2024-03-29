/**
 * your interfaces that you want to work with the loader.
 * It has to implement the TimestampInterface
 */
export interface ShopInterface extends TimeStampInterface {
  id: string; // 136 | A136
  name: string; // Robin's awesome webshop for skis
  address: string; // Austria, 1120 Vienna
  image: string; // url
}

/**
 * your service or class that handles your entity access needs to implement this interface to allow the resource-loader to handle the IDB Layer
 */
export interface ResourceEntityInterface {
  version: number;
  objectStoreHandle: string;
  onUpgradeNeededCallback: (IDBObjectStore: IDBObjectStore, oldVersion?: any, newVersion?: any) => void;
}

/**
 * the (private) timestamp that is used to determine the loaders behavior
 */
export interface TimeStampInterface {
  timestamp: number; // time in milli(!)seconds since 01.01.1970
}

/**
 * your results wrapped in an object that also tells you where the origin of that data is from
 */
export interface ResourceInterface<T extends TimeStampInterface> {
  data: T;
  origin: ResourceOrigin;
}

/**
 * Enum telling you where the resource was loaded from
 */
export enum ResourceOrigin {
  memory = 'memory',
  transferstate = 'transferstate',
  idb = 'idb',
  network = 'network',
}
