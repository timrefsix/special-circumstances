import { expect, test } from '@playwright/test';
import {
  Identity,
  Position,
  Status,
  World,
  createWorldWithMockEntities,
  createWorldTelemetry,
  createMockWorldEnvironment,
  type SystemRunEvent,
} from '../src/ecs';

test.describe('ECS world', () => {
  test('adds components and queries entities', () => {
    const world = new World();
    const entity = world.createEntity();

    world.addComponent(entity, Identity, { id: 'entity-1', name: 'Entity One' });
    world.addComponent(entity, Position, { x: 10, y: 20 });
    world.addComponent(entity, Status, { value: 'idle' });

    const results = world.query([Identity, Position, Status] as const);
    expect(results).toHaveLength(1);

    const [queriedEntity, identity, position, status] = results[0]!;
    expect(queriedEntity).toBe(entity);
    expect(identity).toEqual({ id: 'entity-1', name: 'Entity One' });
    expect(position).toEqual({ x: 10, y: 20 });
    expect(status).toEqual({ value: 'idle' });
  });

  test('notifies subscribers when the world changes', () => {
    const world = createWorldWithMockEntities();
    const notifications: number[] = [];

    const unsubscribe = world.subscribe(() => {
      notifications.push(1);
    });

    const entity = world.createEntity();
    world.addComponent(entity, Identity, { id: 'entity-2', name: 'Entity Two' });
    world.addComponent(entity, Status, { value: 'moving' });
    world.removeComponent(entity, Status);
    world.destroyEntity(entity);

    unsubscribe();

    expect(notifications.length).toBe(5);
  });

  test('emits observer events for entity and component changes', () => {
    const world = new World({ instrumentation: true });
    const events: string[] = [];
    const destroyedSnapshots: string[][] = [];

    world.observe({
      onEntityCreated: (event) => {
        events.push(event.type);
        expect(event.timestamp).toBeGreaterThan(0);
      },
      onComponentChanged: (event) => {
        events.push(`${event.changeType}:${event.component.name}`);
        if (event.changeType === 'added') {
          expect(event.previousValue).toBeUndefined();
        }
      },
      onEntityDestroyed: (event) => {
        events.push(event.type);
        destroyedSnapshots.push(event.components.map((item) => item.component.name));
      },
    });

    const entity = world.createEntity();
    world.addComponent(entity, Identity, { id: 'entity-obs', name: 'Entity Observer' });
    world.addComponent(entity, Status, { value: 'idle' });
    world.addComponent(entity, Status, { value: 'moving' });
    world.removeComponent(entity, Status);
    world.destroyEntity(entity);

    expect(events).toEqual([
      'entity-created',
      'added:identity',
      'added:status',
      'updated:status',
      'removed:status',
      'entity-destroyed',
    ]);
    expect(destroyedSnapshots).toEqual([['identity']]);
  });

  test('records system run telemetry', () => {
    const world = new World({ instrumentation: true });
    const runs: SystemRunEvent[] = [];

    world.observe({
      onSystemRun: (event) => {
        runs.push(event);
      },
    });

    world.reportSystemRun({ system: 'movement', phase: 'start', tick: 12 });
    world.reportSystemRun({ system: 'movement', phase: 'end', tick: 12, durationMs: 4.2 });

    expect(runs).toHaveLength(2);
    expect(runs[0]).toMatchObject({ system: 'movement', phase: 'start', tick: 12 });
    expect(runs[1]).toMatchObject({ system: 'movement', phase: 'end', durationMs: 4.2 });
    for (const run of runs) {
      expect(run.timestamp).toBeGreaterThan(0);
    }
  });

  test('bootstrap helper can return telemetry', () => {
    const basic = createMockWorldEnvironment();
    expect(basic.world).toBeInstanceOf(World);
    expect(basic.telemetry).toBeUndefined();

    const withTelemetry = createMockWorldEnvironment({ telemetry: { bufferSize: 8 } });
    expect(withTelemetry.world).toBeInstanceOf(World);
    expect(withTelemetry.telemetry).toBeDefined();
    expect(withTelemetry.telemetry?.getSnapshot().events.length).toBeGreaterThan(0);
  });

  test('buffers world events and exposes aggregated stats', () => {
    const world = new World({ instrumentation: true });
    const telemetry = createWorldTelemetry(world, { bufferSize: 4 });
    const lengths: number[] = [];

    const unsubscribeTelemetry = telemetry.subscribe(() => {
      lengths.push(telemetry.getSnapshot().events.length);
    });

    const entity = world.createEntity();
    world.addComponent(entity, Identity, { id: 'observer-1', name: 'Observer One' });
    world.addComponent(entity, Status, { value: 'idle' });
    world.addComponent(entity, Status, { value: 'moving' });
    world.reportSystemRun({ system: 'movement', phase: 'start', tick: 1 });
    world.reportSystemRun({ system: 'movement', phase: 'end', tick: 1, durationMs: 5 });

    const snapshot = telemetry.getSnapshot();

    expect(snapshot.totalEvents).toBe(6);
    expect(snapshot.events).toHaveLength(4);
    expect(snapshot.componentChanges.identity.added).toBe(1);
    expect(snapshot.componentChanges.status.added).toBe(1);
    expect(snapshot.componentChanges.status.updated).toBe(1);
    expect(snapshot.entityEventCounts[String(entity)]).toBe(4);

    const movementStats = snapshot.systemRuns.movement;
    expect(movementStats).toBeDefined();
    expect(movementStats.runs).toBe(2);
    expect(movementStats.totalDurationMs).toBe(5);
    expect(movementStats.lastPhase).toBe('end');
    expect(movementStats.lastDurationMs).toBe(5);

    telemetry.clear();
    const clearedSnapshot = telemetry.getSnapshot();
    expect(clearedSnapshot.totalEvents).toBe(0);
    expect(clearedSnapshot.events).toHaveLength(0);
    expect(lengths.length).toBeGreaterThan(0);
    expect(lengths[lengths.length - 1]).toBe(0);

    unsubscribeTelemetry();
    telemetry.dispose();
  });
});
