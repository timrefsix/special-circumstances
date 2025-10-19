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
}

export class MotorScriptModule extends BaseScriptModule {
  private heading: number;

  constructor(
    private readonly world: World,
    private readonly entity: Entity,
    options: MotorModuleOptions = {},
  ) {
    super('motor');
    this.heading = this.normalizeHeading(options.initialHeading ?? 0);

    this.registerFunction({
      name: 'forward',
      parameters: [{ name: 'distance', type: 'number' }],
      invoke: (args, meta) => {
        const distance = this.readNumberArgument(args, 0, meta);
        this.translate(distance, meta);
      },
    });

    this.registerFunction({
      name: 'backwards',
      parameters: [{ name: 'distance', type: 'number' }],
      invoke: (args, meta) => {
        const distance = this.readNumberArgument(args, 0, meta);
        this.translate(-distance, meta);
      },
    });

    this.registerFunction({
      name: 'left',
      parameters: [{ name: 'angle', type: 'number' }],
      invoke: (args, meta) => {
        const angle = this.readNumberArgument(args, 0, meta);
        this.rotate(angle);
      },
    });

    this.registerFunction({
      name: 'right',
      parameters: [{ name: 'angle', type: 'number' }],
      invoke: (args, meta) => {
        const angle = this.readNumberArgument(args, 0, meta);
        this.rotate(-angle);
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
      return;
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

    const nextX = roundToPrecision(position.x + deltaX);
    const nextY = roundToPrecision(position.y - deltaY);

    this.world.addComponent(this.entity, Position, {
      x: nextX,
      y: nextY,
    });
  }

  private rotate(angle: number) {
    if (angle === 0) {
      return;
    }

    const updated = this.heading + angle;
    this.heading = this.normalizeHeading(updated);
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
}
