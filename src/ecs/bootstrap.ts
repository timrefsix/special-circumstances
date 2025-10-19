import { Identity, Lifecycle, Modules, Position, Status, Telemetry } from './components';
import { World } from './world';
import type { WorldOptions } from './world';
import {
  createWorldTelemetry,
  type WorldTelemetry,
  type WorldTelemetryOptions,
} from './telemetry';
import { mockEntities } from '../data/mockEntities';

export interface MockWorldOptions extends WorldOptions {
  telemetry?: boolean | WorldTelemetryOptions;
}

export interface MockWorldEnvironment {
  world: World;
  telemetry?: WorldTelemetry;
}

export const createWorldWithMockEntities = (options: WorldOptions = {}) => {
  const world = new World(options);
  populateMockWorld(world);
  return world;
};

export const createMockWorldEnvironment = (
  options: MockWorldOptions = {},
): MockWorldEnvironment => {
  const { telemetry, ...worldOptions } = options;
  const world = new World(worldOptions);
  let telemetryInstance: WorldTelemetry | undefined;

  if (telemetry) {
    const telemetryOptions = telemetry === true ? undefined : telemetry;
    telemetryInstance = createWorldTelemetry(world, telemetryOptions);
  }

  populateMockWorld(world);

  if (telemetryInstance) {
    return {
      world,
      telemetry: telemetryInstance,
    };
  }

  return { world };
};

const populateMockWorld = (world: World) => {
  for (const entity of mockEntities) {
    const worldEntity = world.createEntity();
    world.addComponent(worldEntity, Identity, {
      id: entity.id,
      name: entity.name,
    });
    world.addComponent(worldEntity, Position, {
      x: entity.position.x,
      y: entity.position.y,
    });
    world.addComponent(worldEntity, Status, {
      value: entity.status,
    });
    world.addComponent(worldEntity, Modules, {
      items: entity.modules,
    });
    world.addComponent(worldEntity, Lifecycle, {
      value: entity.lifecycle,
    });
    world.addComponent(worldEntity, Telemetry, {
      value: entity.telemetry,
    });
  }
};
