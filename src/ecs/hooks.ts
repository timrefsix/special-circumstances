import { useRef, useSyncExternalStore } from 'react';
import type { ComponentType, Entity, World } from './world';

type ComponentTuple<T extends readonly ComponentType<any>[]> = {
  [K in keyof T]: T[K] extends ComponentType<infer C> ? C : never;
};

type SnapshotMapper<T extends readonly ComponentType<any>[], R> = (
  entity: Entity,
  ...components: ComponentTuple<T>
) => R;

export const useEcsQuery = <T extends readonly ComponentType<any>[], R>(
  world: World,
  componentTypes: T,
  mapper: SnapshotMapper<T, R>,
): R[] => {
  const cacheRef = useRef<{ version: number; value: R[] } | null>(null);

  const getSnapshot = () => {
    const currentVersion = world.getVersion();
    const cached = cacheRef.current;
    if (cached && cached.version === currentVersion) {
      return cached.value;
    }

    const value = world.query(componentTypes).map(([entity, ...components]) => {
      return mapper(entity, ...(components as ComponentTuple<T>));
    });
    cacheRef.current = { version: currentVersion, value };
    return value;
  };

  return useSyncExternalStore(
    (listener) => world.subscribe(listener),
    getSnapshot,
    getSnapshot,
  );
};
