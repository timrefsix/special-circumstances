export type MachineModuleCategory = 'sensor' | 'actuator' | 'utility' | 'comm';

export interface MachineModuleMetadata {
  id: string;
  name: string;
  category: MachineModuleCategory;
  description?: string;
  powerDraw?: number;
}
