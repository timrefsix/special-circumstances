import { BaseScriptModule, type ModuleFunctionResolvedArgument, type ModuleInvocationMeta } from '../runtime';
import { ScriptRuntimeError } from '../errors';
import { Position } from '../../ecs/components';
import type { World, Entity } from '../../ecs/world';

const roundToPrecision = (value: number, precision = 4) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export interface MotorModuleOptions {
  initialHeading?: number;
  durationScale?: number;
}

const TRANSLATION_UNITS_PER_SECOND = 10;
const ROTATION_DEGREES_PER_SECOND = 120;

export class MotorScriptModule extends BaseScriptModule {
  private heading: number;
  private readonly durationScale: number;

  constructor(
    private readonly world: World,
    private readonly entity: Entity,
    options: MotorModuleOptions = {},
  ) {
    super('motor');
    this.heading = this.normalizeHeading(options.initialHeading ?? 0);
    const rawScale = options.durationScale;
    this.durationScale =
      typeof rawScale === 'number' && Number.isFinite(rawScale) ? Math.max(rawScale, 0) : 1;

    this.registerFunction({
      name: 'forward',
      parameters: [{ name: 'distance', type: 'number' }],
      invoke: async (args, meta) => {
        const distance = this.readNumberArgument(args, 0, meta);
        await this.translate(distance, meta);
      },
    });

    this.registerFunction({
      name: 'backwards',
      parameters: [{ name: 'distance', type: 'number' }],
      invoke: async (args, meta) => {
        const distance = this.readNumberArgument(args, 0, meta);
        await this.translate(-distance, meta);
      },
    });

    this.registerFunction({
      name: 'left',
      parameters: [{ name: 'angle', type: 'number' }],
      invoke: async (args, meta) => {
        const angle = this.readNumberArgument(args, 0, meta);
        await this.rotate(angle);
      },
    });

    this.registerFunction({
      name: 'right',
      parameters: [{ name: 'angle', type: 'number' }],
      invoke: async (args, meta) => {
        const angle = this.readNumberArgument(args, 0, meta);
        await this.rotate(-angle);
      },
    });
  }

  getHeading() {
    return this.heading;
  }

  private readNumberArgument(
    args: ModuleFunctionResolvedArgument[],
    index: number,
    meta: ModuleInvocationMeta,
  ) {
    const argument = args[index];
    if (!argument || argument.parameter.type !== 'number') {
      throw new ScriptRuntimeError(
        `Missing numeric argument '${argument?.parameter.name ?? 'value'}' when calling ${meta.module}.${meta.method}`,
        argument?.raw.location ?? meta.location,
      );
    }
    return argument.value;
  }

  private translate(distance: number, meta: ModuleInvocationMeta) {
    if (distance === 0) {
      return Promise.resolve();
    }

    const position = this.world.getComponent(this.entity, Position);
    if (!position) {
      throw new ScriptRuntimeError(
        `Entity ${this.entity} is missing a position component`,
        meta.location,
      );
    }

    const rotation = radians(this.heading);
    const deltaX = Math.sin(rotation) * distance;
    const deltaY = Math.cos(rotation) * distance;

    const startX = position.x;
    const startY = position.y;
    const targetX = roundToPrecision(startX + deltaX);
    const targetY = roundToPrecision(startY - deltaY);

    const magnitude = Math.abs(distance);
    const durationMs = this.estimateTranslationDuration(magnitude);
    if (typeof window !== 'undefined') {
      (window as any).__lastMotorTranslate = { distance, durationMs };
    }
    return this.animate({
      durationMs,
      apply: (progress) => {
        this.recordFrame();
        const currentX = roundToPrecision(startX + deltaX * progress);
        const currentY = roundToPrecision(startY - deltaY * progress);
        this.world.addComponent(this.entity, Position, {
          x: currentX,
          y: currentY,
        });
      },
      finalize: () => {
        this.world.addComponent(this.entity, Position, {
          x: targetX,
          y: targetY,
        });
      },
    });
  }

  private rotate(angle: number) {
    if (angle === 0) {
      return Promise.resolve();
    }

    const startHeading = this.heading;
    const totalDelta = angle;
    const durationMs = this.estimateRotationDuration(Math.abs(angle));

    return this.animate({
      durationMs,
      apply: (progress) => {
        this.recordFrame();
        const nextHeading = startHeading + totalDelta * progress;
        this.heading = this.normalizeHeading(nextHeading);
      },
      finalize: () => {
        this.heading = this.normalizeHeading(startHeading + totalDelta);
      },
    });
  }

  private estimateTranslationDuration(distance: number) {
    if (!Number.isFinite(distance) || distance <= 0) {
      return 0;
    }
    const seconds = distance / TRANSLATION_UNITS_PER_SECOND;
    return Math.max(seconds * 1000, 80);
  }

  private estimateRotationDuration(angle: number) {
    if (!Number.isFinite(angle) || angle <= 0) {
      return 0;
    }
    const seconds = angle / ROTATION_DEGREES_PER_SECOND;
    return Math.max(seconds * 1000, 80);
  }

  private normalizeHeading(value: number) {
    let normalized = value % 360;
    if (normalized < 0) {
      normalized += 360;
    }
    if (normalized === 360) {
      normalized = 0;
    }
    if (Object.is(normalized, -0)) {
      normalized = 0;
    }
    return normalized;
  }

  private animate(options: {
    durationMs: number;
    apply(progress: number): void;
    finalize(): void;
  }) {
    const scaledDuration = Math.max(0, options.durationMs * this.durationScale);
    if (scaledDuration <= 0) {
      options.apply(1);
      options.finalize();
      return Promise.resolve();
    }

    let stop: (() => void) | null = null;
    if (this.supportsAnimation()) {
      stop = this.startFrameLoop({ durationMs: scaledDuration, apply: options.apply });
    } else {
      options.apply(0);
    }

    return this.delay(scaledDuration).then(() => {
      if (stop) {
        stop();
      }
      options.apply(1);
      options.finalize();
    });
  }

  private startFrameLoop(options: { durationMs: number; apply(progress: number): void }) {
    let active = true;
    const start = this.now();
    const tick = () => {
      if (!active) {
        return;
      }
      const elapsed = this.now() - start;
      const progress = Math.min(elapsed / options.durationMs, 0.9995);
      options.apply(progress);
      this.requestAnimationFrame(tick);
    };
    this.requestAnimationFrame(tick);
    return () => {
      active = false;
    };
  }

  private supportsAnimation() {
    return typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';
  }

  private requestAnimationFrame(callback: FrameRequestCallback) {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(callback);
    } else {
      setTimeout(() => callback(this.now()), 16);
    }
  }

  private now() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }

  private delay(durationMs: number) {
    if (durationMs <= 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), durationMs);
    });
  }

  private recordFrame() {
    if (typeof window === 'undefined') {
      return;
    }
    const scope = window as unknown as { __motorFrameCount?: number };
    scope.__motorFrameCount = (scope.__motorFrameCount ?? 0) + 1;
  }

}
