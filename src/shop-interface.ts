export interface ShopInterface extends TimeStampInterface {
  id: string; // 136 | A136
  name: string; // Robin's awesome webshop for skis
  adress: string; // Austria, 1120 Vienna
  image: string; // url
}

export interface TimeStampInterface {
  timestamp: number; // time in milli(!)seconds since 01.01.1970
}


export interface ResourceInterface<T> {
  data: T;
  origin: ResourceOrigin;
}

export enum ResourceOrigin {
  memory,
  transferstate,
  idb,
  network
}