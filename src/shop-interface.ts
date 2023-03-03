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

export interface ResourceEntityInterface {
  version: number;
  onUpgradeNeededCallback: (IDBObjectStore: IDBObjectStore) => void;
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
