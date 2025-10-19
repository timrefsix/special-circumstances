import type { WorldEntity } from '../types/entity';

export const mockEntities: WorldEntity[] = [
  {
    id: 'alpha',
    name: 'Alpha Runner',
    position: { x: 20, y: 35 },
    status: 'moving',
    modules: [
      {
        id: 'alpha-scan',
        name: 'WideScan Lidar',
        category: 'sensor',
        description: 'Long-range lidar array streaming distance samples.',
        state: 'active',
      },
      {
        id: 'alpha-move',
        name: 'Vector Drive',
        category: 'actuator',
        description: 'Omnidirectional thruster pack allowing strafed movement.',
        state: 'active',
      },
      {
        id: 'alpha-mem',
        name: 'Memory Vault',
        category: 'utility',
        description: 'Solid-state module backing script heap and scratch buffers.',
        state: 'standby',
      },
    ],
    lifecycle: {
      lastHeartbeat: '2.4s ago',
      uptimeSeconds: 1894,
      notes: 'Executing patrol loop segment 3.',
    },
    telemetry: {
      batteryLevel: 82,
      temperatureC: 36.5,
    },
  },
  {
    id: 'bravo',
    name: 'Bravo Scout',
    position: { x: 55, y: 64 },
    status: 'idle',
    modules: [
      {
        id: 'bravo-cam',
        name: 'Spectral Camera',
        category: 'sensor',
        description: 'Captures multispectral frames for environment analysis.',
        state: 'standby',
      },
      {
        id: 'bravo-comm',
        name: 'Relay Mesh',
        category: 'comm',
        description: 'Maintains low-latency channel to nearby units.',
        state: 'active',
      },
    ],
    lifecycle: {
      lastHeartbeat: '0.9s ago',
      uptimeSeconds: 9840,
      notes: 'Awaiting new survey instructions.',
    },
    telemetry: {
      batteryLevel: 64,
      temperatureC: 33.1,
    },
  },
  {
    id: 'charlie',
    name: 'Charlie Worker',
    position: { x: 78, y: 28 },
    status: 'error',
    modules: [
      {
        id: 'charlie-arm',
        name: 'Manipulator Arm',
        category: 'actuator',
        description: 'Multi-tool gripper for material handling tasks.',
        state: 'offline',
      },
      {
        id: 'charlie-diagnostics',
        name: 'Diagnostics HUD',
        category: 'utility',
        description: 'Surface subsystem diagnostics and fault codes.',
        state: 'active',
      },
    ],
    lifecycle: {
      lastHeartbeat: '15.7s ago',
      uptimeSeconds: 412,
      notes: 'Fault: actuator overload. Awaiting technician override.',
    },
    telemetry: {
      batteryLevel: 48,
      temperatureC: 41.9,
    },
  },
];
