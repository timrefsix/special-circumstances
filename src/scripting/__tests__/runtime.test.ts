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
  it('invokes registered module functions in order', () => {
    const module = new RecordingModule();
    const engine = new ScriptEngine([module]);

    engine.execute('test.ping(42); test.flag(true);');

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

  it('throws when a module is missing', () => {
    const engine = new ScriptEngine();
    expect(() => engine.execute('nope.call(1)')).toThrow(ScriptRuntimeError);
  });

  it('throws when a function is missing', () => {
    const module = new RecordingModule();
    const engine = new ScriptEngine([module]);
    expect(() => engine.execute('test.unknown(1)')).toThrow(ScriptRuntimeError);
  });

  it('throws when arguments are missing or extra', () => {
    const module = new RecordingModule();
    const engine = new ScriptEngine([module]);

    expect(() => engine.execute('test.ping()')).toThrow(ScriptRuntimeError);
    expect(() => engine.execute('test.ping(1, 2)')).toThrow(ScriptRuntimeError);
  });

  it('throws when argument types do not match', () => {
    const module = new RecordingModule();
    const engine = new ScriptEngine([module]);

    expect(() => engine.execute('test.ping(true)')).toThrow(ScriptRuntimeError);
    expect(() => engine.execute('test.flag(1)')).toThrow(ScriptRuntimeError);
  });
});
