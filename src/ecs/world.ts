import type {
  ComponentChangeType,
  ComponentSnapshot,
  SystemRunEvent,
  WorldObserver,
} from './observer';

export type Entity = number;

export interface ComponentType<T> {
  readonly name: string;
  readonly key: symbol;
}

type ComponentTuple<T extends readonly ComponentType<any>[]> = {
  [K in keyof T]: T[K] extends ComponentType<infer C> ? C : never;
};

type Listener = () => void;

export interface WorldOptions {
  instrumentation?: boolean;
}

export const defineComponent = <T>(name: string): ComponentType<T> => {
  return {
    name,
    key: Symbol(name),
  };
};

export class World {
  private nextEntityId = 1;
  private readonly componentStores = new Map<symbol, Map<Entity, unknown>>();
  private readonly componentRegistry = new Map<symbol, ComponentType<any>>();
  private readonly entityComponents = new Map<Entity, Set<symbol>>();
  private readonly listeners = new Set<Listener>();
  private version = 0;
  private readonly observers = new Set<WorldObserver>();
  private readonly instrumentationEnabled: boolean;

  constructor(options: WorldOptions = {}) {
    const defaultInstrumentation =
      ((import.meta as any).env?.DEV as boolean | undefined) ??
      (typeof process !== 'undefined' ? process.env?.NODE_ENV !== 'production' : false);

    this.instrumentationEnabled = options.instrumentation ?? Boolean(defaultInstrumentation);
  }

  createEntity(): Entity {
    const entity = this.nextEntityId;
    this.nextEntityId += 1;
    this.entityComponents.set(entity, new Set());
    this.emitEntityCreated(entity);
    this.emitChange();
    return entity;
  }

  destroyEntity(entity: Entity) {
    const components = this.entityComponents.get(entity);
    if (!components) {
      return;
    }

    const snapshot: ComponentSnapshot[] = [];

    for (const componentKey of components) {
      const store = this.componentStores.get(componentKey);
      const value = store?.get(entity);
      const componentType = this.componentRegistry.get(componentKey);
      if (componentType) {
        snapshot.push({
          component: componentType,
          value,
        });
      }
      store?.delete(entity);
    }

    this.entityComponents.delete(entity);
    this.emitEntityDestroyed(entity, snapshot);
    this.emitChange();
  }

  addComponent<T>(entity: Entity, componentType: ComponentType<T>, data: T) {
    this.assertEntityExists(entity);
    const store = this.ensureStore(componentType);
    const existing = store.get(entity);

    if (existing && Object.is(existing, data)) {
      return;
    }

    store.set(entity, data);
    this.entityComponents.get(entity)?.add(componentType.key);
    const changeType: ComponentChangeType = existing === undefined ? 'added' : 'updated';
    this.emitComponentChanged(changeType, entity, componentType, existing, data);
    this.emitChange();
  }

  removeComponent<T>(entity: Entity, componentType: ComponentType<T>) {
    this.assertEntityExists(entity);

    const store = this.componentStores.get(componentType.key);
    if (!store || !store.has(entity)) {
      return;
    }

    const previous = store.get(entity) as T | undefined;
    store.delete(entity);
    const components = this.entityComponents.get(entity);
    components?.delete(componentType.key);
    this.emitComponentChanged('removed', entity, componentType, previous, null);
    this.emitChange();
  }

  getComponent<T>(entity: Entity, componentType: ComponentType<T>): T | null {
    const store = this.componentStores.get(componentType.key);
    if (!store) {
      return null;
    }

    const component = store.get(entity);
    return (component ?? null) as T | null;
  }

  hasComponent<T>(entity: Entity, componentType: ComponentType<T>): boolean {
    const components = this.entityComponents.get(entity);
    return components?.has(componentType.key) ?? false;
  }

  query<T extends readonly ComponentType<any>[]>(
    componentTypes: T,
  ): Array<[Entity, ...ComponentTuple<T>]> {
    if (componentTypes.length === 0) {
      return [];
    }

    const [primaryType, ...restTypes] = componentTypes;
    const primaryStore = this.ensureStore(primaryType);
    const results: Array<[Entity, ...ComponentTuple<T>]> = [];

    for (const [entity, primaryComponent] of primaryStore.entries()) {
      if (!this.entityComponents.has(entity)) {
        continue;
      }

      const tuple: unknown[] = [entity, primaryComponent];
      let matchesAll = true;

      for (const type of restTypes) {
        const store = this.ensureStore(type);
        if (!store.has(entity)) {
          matchesAll = false;
          break;
        }

        tuple.push(store.get(entity));
      }

      if (matchesAll) {
        results.push(tuple as [Entity, ...ComponentTuple<T>]);
      }
    }

    return results;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getVersion(): number {
    return this.version;
  }

  observe(observer: WorldObserver): () => void {
    if (!this.instrumentationEnabled) {
      return () => {};
    }

    this.observers.add(observer);
    return () => {
      this.observers.delete(observer);
    };
  }

  reportSystemRun(event: Omit<SystemRunEvent, 'timestamp'>) {
    this.emitSystemRun(event);
  }

  private ensureStore<T>(componentType: ComponentType<T>) {
    const existing = this.componentStores.get(componentType.key);
    if (existing) {
      return existing as Map<Entity, T>;
    }

    const store = new Map<Entity, T>();
    this.componentStores.set(componentType.key, store);
    if (!this.componentRegistry.has(componentType.key)) {
      this.componentRegistry.set(componentType.key, componentType);
    }
    return store;
  }

  private assertEntityExists(entity: Entity) {
    if (!this.entityComponents.has(entity)) {
      throw new Error(`Entity ${entity} does not exist in this world.`);
    }
  }

  private emitChange() {
    this.version += 1;
    if (this.listeners.size === 0) {
      return;
    }

    for (const listener of this.listeners) {
      listener();
    }
  }

  private emitEntityCreated(entity: Entity) {
    if (!this.shouldNotifyObservers()) {
      return;
    }

    const timestamp = this.now();
    for (const observer of this.observers) {
      observer.onEntityCreated?.({
        type: 'entity-created',
        entity,
        timestamp,
      });
    }
  }

  private emitEntityDestroyed(entity: Entity, components: ComponentSnapshot[]) {
    if (!this.shouldNotifyObservers()) {
      return;
    }

    const timestamp = this.now();
    for (const observer of this.observers) {
      observer.onEntityDestroyed?.({
        type: 'entity-destroyed',
        entity,
        components,
        timestamp,
      });
    }
  }

  private emitComponentChanged(
    changeType: ComponentChangeType,
    entity: Entity,
    component: ComponentType<any>,
    previousValue: unknown,
    value: unknown,
  ) {
    if (!this.shouldNotifyObservers()) {
      return;
    }

    const timestamp = this.now();
    for (const observer of this.observers) {
      observer.onComponentChanged?.({
        type: 'component-changed',
        changeType,
        entity,
        component,
        previousValue,
        value,
        timestamp,
      });
    }
  }

  private emitSystemRun(event: Omit<SystemRunEvent, 'timestamp'>) {
    if (!this.shouldNotifyObservers()) {
      return;
    }

    const timestamp = this.now();
    for (const observer of this.observers) {
      observer.onSystemRun?.({
        ...event,
        type: 'system-run',
        timestamp,
      });
    }
  }

  private shouldNotifyObservers() {
    return this.instrumentationEnabled && this.observers.size > 0;
  }

  private now() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }

    return Date.now();
  }
}
