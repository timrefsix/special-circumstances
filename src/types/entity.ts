export type EntityStatus = 'idle' | 'moving' | 'error';

export type ModuleCategory = 'sensor' | 'actuator' | 'utility' | 'comm';

export interface EntityModule {
  id: string;
  name: string;
  category: ModuleCategory;
  description: string;
  state: 'active' | 'standby' | 'offline';
}

export interface EntityLifecycle {
  lastHeartbeat: string;
  uptimeSeconds: number;
  notes: string;
}

export interface EntityTelemetry {
  batteryLevel: number;
  temperatureC: number;
}

export interface WorldEntity {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  status: EntityStatus;
  modules: EntityModule[];
  lifecycle: EntityLifecycle;
  telemetry: EntityTelemetry;
}
