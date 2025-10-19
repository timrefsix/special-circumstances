import { describe, expect, it } from 'vitest';
import { DebugScriptModule } from '../modules/debug';
import { ScriptEngine } from '../runtime';
import { ScriptSyntaxError } from '../errors';

describe('DebugScriptModule', () => {
  const setup = () => {
    const module = new DebugScriptModule();
    const engine = new ScriptEngine([module]);
    return { module, engine };
  };

  it('tracks pen state and color changes', async () => {
    const { module, engine } = setup();

    await engine.execute('debug.pen(true); debug.color(#112233)');

    expect(module.isPenDown()).toBe(true);
    expect(module.getColor()).toBe('#112233');
    expect(module.getHistory()).toEqual(['pen(true)', 'color(#112233)']);
  });

  it('exposes a snapshot of the current state', async () => {
    const { module, engine } = setup();
    await engine.execute('debug.pen(true); debug.color(#abc)');
    expect(module.snapshot()).toEqual({ penDown: true, color: '#abc', history: ['pen(true)', 'color(#abc)'] });
  });

  it('rejects malformed hex colors during parsing', () => {
    const { engine } = setup();
    expect(() => engine.execute('debug.color(red)')).toThrow(ScriptSyntaxError);
  });

  it('caps history length to 50 entries', async () => {
    const { module, engine } = setup();
    const commands = Array.from({ length: 55 }, (_, index) => `debug.pen(${index % 2 === 0 ? 'true' : 'false'})`).join(';');
    await engine.execute(commands);
    expect(module.getHistory()).toHaveLength(50);
  });
});
