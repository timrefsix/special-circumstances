import type { DebugSnapshot } from '../scripting/modules/debug';

export type BotScriptRunResult =
  | { status: 'idle' }
  | { status: 'running'; timestamp: number }
  | {
      status: 'success';
      timestamp: number;
      heading: number;
      position: { x: number; y: number };
      debug: DebugSnapshot;
    }
  | {
      status: 'error';
      timestamp: number;
      message: string;
    };

export interface BotScriptState {
  source: string;
  lastRun: BotScriptRunResult;
}
