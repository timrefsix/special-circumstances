import { describe, expect, it } from 'vitest';
import { ScriptEngine, BaseScriptModule } from '../runtime';
import { ScriptRuntimeError } from '../errors';

class RecordingModule extends BaseScriptModule {
  public readonly calls: Array<{ method: string; values: unknown[] }> = [];

  constructor() {
    super('test');

    this.registerFunction({
      name: 'ping',
      parameters: [{ name: 'value', type: 'number' }],
      invoke: (args) => {
        this.calls.push({ method: 'ping', values: args.map((arg) => arg.value) });
      },
    });

    this.registerFunction({
      name: 'flag',
      parameters: [{ name: 'enabled', type: 'boolean' }],
      invoke: (args) => {
        this.calls.push({ method: 'flag', values: args.map((arg) => arg.value) });
      },
    });
  }
}

describe('ScriptEngine', () => {
  it('invokes registered module functions in order', async () => {
    const module = new RecordingModule();
    const engine = new ScriptEngine([module]);

    await engine.execute('test.ping(42); test.flag(true);');

    expect(module.calls).toStrictEqual([
      { method: 'ping', values: [42] },
      { method: 'flag', values: [true] },
    ]);
  });

  it('produces a command list when compiling', () => {
    const engine = new ScriptEngine();
    const commands = engine.compile('test.ping(3)');
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({ module: 'test', method: 'ping' });
  });

  it('throws when a module is missing', async () => {
    const engine = new ScriptEngine();
    await expect(engine.execute('nope.call(1)')).rejects.toThrow(ScriptRuntimeError);
  });

  it('throws when a function is missing', async () => {
    const module = new RecordingModule();
    const engine = new ScriptEngine([module]);
    await expect(engine.execute('test.unknown(1)')).rejects.toThrow(ScriptRuntimeError);
  });

  it('throws when arguments are missing or extra', async () => {
    const module = new RecordingModule();
    const engine = new ScriptEngine([module]);

    await expect(engine.execute('test.ping()')).rejects.toThrow(ScriptRuntimeError);
    await expect(engine.execute('test.ping(1, 2)')).rejects.toThrow(ScriptRuntimeError);
  });

  it('throws when argument types do not match', async () => {
    const module = new RecordingModule();
    const engine = new ScriptEngine([module]);

    await expect(engine.execute('test.ping(true)')).rejects.toThrow(ScriptRuntimeError);
    await expect(engine.execute('test.flag(1)')).rejects.toThrow(ScriptRuntimeError);
  });
});
