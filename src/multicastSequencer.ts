import { Observer, Subscriber, TeardownLogic } from 'rxjs';

/**
 * Observable function that will allow multiple subscription handling to same resource in a very
 * fetch conservative manner.
 */
export function multicastSequencer<T>(
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
