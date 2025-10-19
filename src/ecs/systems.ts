import { Lifecycle, Status, Telemetry } from './components';
import type { System } from './runtime';
import type { EntityStatus } from '../types/entity';
import type { World } from './world';

interface HeartbeatState {
  elapsed: number;
}

interface TemperatureState {
  phase: number;
  base: number;
}

const HEARTBEAT_RESET_SECONDS = 5;
const TEMPERATURE_PHASE_SPEED = 0.8;
const TEMPERATURE_AMPLITUDE = 0.4;
const BATTERY_DRAIN_PER_SECOND = 0.05;

const ensureHeartbeatState = (state: Map<number, HeartbeatState>, entity: number) => {
  let current = state.get(entity);
  if (!current) {
    current = { elapsed: 0 };
    state.set(entity, current);
  }
  return current;
};

const ensureTemperatureState = (state: Map<number, TemperatureState>, entity: number, base: number) => {
  let current = state.get(entity);
  if (!current) {
    current = { phase: 0, base };
    state.set(entity, current);
  }
  return current;
};

export const createLifecycleSystem = (): System => {
  const heartbeatState = new Map<number, HeartbeatState>();

  return {
    name: 'lifecycle',
    update(world, deltaMs) {
      const deltaSeconds = deltaMs / 1000;
      const results = world.query([Lifecycle] as const);

      for (const [entity, lifecycle] of results) {
        const heartbeat = ensureHeartbeatState(heartbeatState, entity);
        heartbeat.elapsed += deltaSeconds;

        let nextHeartbeatLabel: string;
        if (heartbeat.elapsed >= HEARTBEAT_RESET_SECONDS) {
          nextHeartbeatLabel = 'just now';
          heartbeat.elapsed = 0;
        } else {
          nextHeartbeatLabel = `${heartbeat.elapsed.toFixed(1)}s ago`;
        }

        const uptimeSeconds = Math.floor(lifecycle.value.uptimeSeconds + deltaSeconds);

        world.addComponent(entity, Lifecycle, {
          value: {
            ...lifecycle.value,
            uptimeSeconds,
            lastHeartbeat: nextHeartbeatLabel,
          },
        });
      }
    },
  };
};

export const createTelemetrySystem = (): System => {
  const temperatureState = new Map<number, TemperatureState>();

  return {
    name: 'telemetry',
    update(world, deltaMs) {
      const deltaSeconds = deltaMs / 1000;
      const results = world.query([Telemetry] as const);

      for (const [entity, telemetry] of results) {
        const tempState = ensureTemperatureState(temperatureState, entity, telemetry.value.temperatureC);
        tempState.phase += deltaSeconds * TEMPERATURE_PHASE_SPEED;
        const oscillation = Math.sin(tempState.phase) * TEMPERATURE_AMPLITUDE;
        const temperatureC = Number((tempState.base + oscillation).toFixed(2));

        const batteryDrain = deltaSeconds * BATTERY_DRAIN_PER_SECOND;
        const batteryLevel = Number(Math.max(telemetry.value.batteryLevel - batteryDrain, 0).toFixed(2));

        world.addComponent(entity, Telemetry, {
          value: {
            ...telemetry.value,
            batteryLevel,
            temperatureC,
          },
        });
      }
    },
  };
};

export const createStatusFromTelemetrySystem = (): System => {
  const baselineStatus = new Map<number, EntityStatus>();

  const determineStatus = (entity: number, batteryLevel: number, current: EntityStatus) => {
    const baseline = baselineStatus.get(entity) ?? current;
    if (!baselineStatus.has(entity)) {
      baselineStatus.set(entity, baseline);
    }

    if (batteryLevel < 15) {
      return 'error';
    }

    if (batteryLevel < 45) {
      return baseline === 'error' ? 'error' : 'idle';
    }

    return baseline === 'moving' ? 'moving' : baseline;
  };

  return {
    name: 'status-balance',
    update(world, deltaMs) {
      void deltaMs;
      const results = world.query([Status, Telemetry] as const);

      for (const [entity, status, telemetry] of results) {
        const nextStatus = determineStatus(entity, telemetry.value.batteryLevel, status.value);
        if (nextStatus !== status.value) {
          world.addComponent(entity, Status, { value: nextStatus });
        }
      }
    },
  };
};
