import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  Identity,
  Lifecycle,
  Modules,
  Position,
  Status,
  Telemetry,
  createMockWorldEnvironment,
  useEcsQuery,
} from './ecs';
import { TickController } from './ecs/runtime';
import {
  createLifecycleSystem,
  createStatusFromTelemetrySystem,
  createTelemetrySystem,
} from './ecs/systems';
import type { WorldEntity } from './types/entity';
import { EntityDetails } from './components/EntityDetails';
import { TelemetryInspector } from './components/TelemetryInspector';
import { BotScriptConsole } from './components/BotScriptConsole';
import { createBotScriptEnvironment } from './scripting/environment';
import type { BotScriptState } from './types/botScript';

const PANEL_STORAGE_KEY = 'ui.panelCollapsed';
const PANEL_WIDTH_STORAGE_KEY = 'ui.panelWidth';
const DEFAULT_PANEL_WIDTH = 320;
const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 520;
const DEFAULT_BOT_SCRIPT = `motor.forward(6)
motor.left(90)
motor.forward(3)
debug.pen(true)
debug.color(#ff3366)`;

const createDefaultBotScriptState = (): BotScriptState => ({
  source: DEFAULT_BOT_SCRIPT,
  lastRun: { status: 'idle' },
});

const clampWidth = (value: number) => {
  return Math.min(Math.max(value, MIN_PANEL_WIDTH), MAX_PANEL_WIDTH);
};

const readCollapsedState = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(PANEL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const readPanelWidth = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_PANEL_WIDTH;
  }

  try {
    const stored = window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PANEL_WIDTH;
    }

    const parsed = Number.parseInt(stored, 10);
    if (Number.isNaN(parsed)) {
      return DEFAULT_PANEL_WIDTH;
    }

    return clampWidth(parsed);
  } catch {
    return DEFAULT_PANEL_WIDTH;
  }
};

const App = () => {
  const shellRef = useRef<HTMLElement | null>(null);
  const resizeHandleRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(DEFAULT_PANEL_WIDTH);

  const environment = useMemo(
    () => createMockWorldEnvironment({ telemetry: true, instrumentation: true }),
    [],
  );
  const { world, telemetry } = environment;
  const entityComponents = useMemo(
    () => [Identity, Position, Status, Modules, Lifecycle, Telemetry] as const,
    [],
  );
  const entities = useEcsQuery(
    world,
    entityComponents,
    (_, identity, position, status, modules, lifecycle, telemetry): WorldEntity => ({
      id: identity.id,
      name: identity.name,
      position: { x: position.x, y: position.y },
      status: status.value,
      modules: modules.items,
      lifecycle: lifecycle.value,
      telemetry: telemetry.value,
    }),
  );

  const [collapsed, setCollapsed] = useState(() => readCollapsedState());
  const [panelWidth, setPanelWidth] = useState(() => clampWidth(readPanelWidth()));
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(() => {
    const seed = world.query([Identity] as const);
    return seed.length > 0 ? seed[0]![1].id : null;
  });
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [botScripts, setBotScripts] = useState<Record<string, BotScriptState>>({});

  const tickController = useMemo(() => {
    const controller = new TickController(world);
    controller.register(createLifecycleSystem());
    controller.register(createTelemetrySystem());
    controller.register(createStatusFromTelemetrySystem());
    return controller;
  }, [world]);

  const panelWidthForStyle = useMemo(() => (collapsed ? 0 : panelWidth), [collapsed, panelWidth]);
  const selectedEntity = useMemo(() => {
    if (!selectedEntityId) {
      return null;
    }

    return entities.find((entity) => entity.id === selectedEntityId) ?? null;
  }, [entities, selectedEntityId]);

  const selectedEntityHandle = useMemo(() => {
    if (!selectedEntityId) {
      return null;
    }

    const results = world.query([Identity] as const);
    for (const [entity, identity] of results) {
      if (identity.id === selectedEntityId) {
        return entity;
      }
    }

    return null;
  }, [world, selectedEntityId]);

  const selectedScriptState = useMemo(() => {
    if (!selectedEntityId) {
      return null;
    }

    return botScripts[selectedEntityId] ?? createDefaultBotScriptState();
  }, [botScripts, selectedEntityId]);

  const isScriptRunning = selectedScriptState?.lastRun.status === 'running';
  const canRunScript =
    Boolean(selectedEntityHandle) &&
    Boolean(selectedScriptState && selectedScriptState.source.trim().length > 0) &&
    !isScriptRunning;

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    shell.style.setProperty('--panel-width', `${Math.round(panelWidthForStyle)}px`);
  }, [panelWidthForStyle]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PANEL_STORAGE_KEY, String(collapsed));
    } catch {
      // no-op if storage is unavailable
    }
  }, [collapsed]);

  useEffect(() => {
    tickController.start();
    return () => {
      tickController.stop();
    };
  }, [tickController]);

  useEffect(() => {
    if (collapsed) {
      return;
    }

    try {
      window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(panelWidth));
    } catch {
      // no-op if storage is unavailable
    }
  }, [panelWidth, collapsed]);

  useEffect(() => {
    return () => {
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
    };
  }, []);

  const handleBotScriptChange = useCallback((entityId: string, nextSource: string) => {
    setBotScripts((current) => {
      const existing = current[entityId];
      if (existing && existing.source === nextSource && existing.lastRun.status === 'idle') {
        return current;
      }

      return {
        ...current,
        [entityId]: {
          source: nextSource,
          lastRun: { status: 'idle' },
        },
      };
    });
  }, []);

  const handleRunBotScript = useCallback(async () => {
    if (!selectedEntityId || !selectedEntityHandle || !selectedScriptState) {
      return;
    }

    const targetEntityId = selectedEntityId;
    const targetHandle = selectedEntityHandle;
    const source = selectedScriptState.source;
    const trimmed = source.trim();

    if (trimmed.length === 0) {
      const timestamp = Date.now();
      setBotScripts((current) => ({
        ...current,
        [targetEntityId]: {
          source,
          lastRun: {
            status: 'error',
            timestamp,
            message: 'Add at least one command before running the script.',
          },
        },
      }));
      return;
    }

    const runTimestamp = Date.now();
    setBotScripts((current) => ({
      ...current,
      [targetEntityId]: {
        source,
        lastRun: {
          status: 'running',
          timestamp: runTimestamp,
        },
      },
    }));

    try {
      const environment = createBotScriptEnvironment(world, targetHandle);
      const runStart = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
      await environment.engine.execute(source);
      const runEnd = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
      if (typeof window !== 'undefined') {
        (window as any).__lastBotRunDuration = runEnd - runStart;
      }

      const positionComponent = world.getComponent(targetHandle, Position);
      if (!positionComponent) {
        throw new Error('Position component is missing after script execution.');
      }

      const heading = environment.modules.motor.getHeading();
      const debugSnapshot = {
        penDown: environment.modules.debug.isPenDown(),
        color: environment.modules.debug.getColor(),
        history: environment.modules.debug.getHistory(),
      };

      setBotScripts((current) => ({
        ...current,
        [targetEntityId]: {
          source,
          lastRun: {
            status: 'success',
            timestamp: Date.now(),
            heading,
            position: { x: positionComponent.x, y: positionComponent.y },
            debug: debugSnapshot,
          },
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error while running the script.';

      setBotScripts((current) => ({
        ...current,
        [targetEntityId]: {
          source,
          lastRun: {
            status: 'error',
            timestamp: Date.now(),
            message,
          },
        },
      }));
    }
  }, [selectedEntityHandle, selectedEntityId, selectedScriptState, world]);

  const finishResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isResizingRef.current) {
      return;
    }

    isResizingRef.current = false;

    const handle = resizeHandleRef.current;
    if (handle && 'releasePointerCapture' in handle) {
      try {
        handle.releasePointerCapture(event.pointerId);
      } catch {
        // ignore if pointer capture was not set
      }
    }

    resizeHandleRef.current = null;
    document.body.style.removeProperty('user-select');
    document.body.style.removeProperty('cursor');
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.pointerType === 'mouse') {
        return;
      }

      if (collapsed) {
        return;
      }

      isResizingRef.current = true;
      resizeStartXRef.current = event.clientX;
      resizeStartWidthRef.current = panelWidth;
      resizeHandleRef.current = event.currentTarget;

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // ignored if pointer capture is not available
      }

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      event.preventDefault();
    },
    [collapsed, panelWidth],
  );

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isResizingRef.current) {
      return;
    }

    const delta = resizeStartXRef.current - event.clientX;
    const nextWidth = clampWidth(Math.round(resizeStartWidthRef.current + delta));

    setPanelWidth((current) => (current === nextWidth ? current : nextWidth));
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      finishResize(event);
    },
    [finishResize],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      finishResize(event);
    },
    [finishResize],
  );

  const handleLostPointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      finishResize(event);
    },
    [finishResize],
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => !current);
  }, []);

  const toggleInspector = useCallback(() => {
    setInspectorOpen((current) => !current);
  }, []);

  const edgeClassName = collapsed ? 'panel-edge collapsed' : 'panel-edge';
  const handleClassName = collapsed ? 'panel-resize-handle is-inactive' : 'panel-resize-handle';
  const panelClassName = collapsed ? 'info-panel collapsed' : 'info-panel';

  const handleEntitySelect = useCallback((entityId: string) => {
    setSelectedEntityId(entityId);
  }, []);

  const renderEntity = (entity: WorldEntity) => {
    const isSelected = entity.id === selectedEntityId;
    const statusClass = `entity-node status-${entity.status}`;
    const className = isSelected ? `${statusClass} is-selected` : statusClass;

    return (
      <button
        key={entity.id}
        type="button"
        className={className}
        style={{
          left: `${entity.position.x}%`,
          top: `${entity.position.y}%`,
        }}
        data-testid="world-entity"
        data-entity-id={entity.id}
        aria-pressed={isSelected}
        onClick={() => handleEntitySelect(entity.id)}
      >
        <span className="entity-node__label">{entity.name}</span>
      </button>
    );
  };

  const scriptConsole =
    selectedEntity && selectedScriptState
      ? (
          <BotScriptConsole
            entityName={selectedEntity.name}
            script={selectedScriptState.source}
            status={selectedScriptState.lastRun}
            canRun={canRunScript}
            onScriptChange={(value) => handleBotScriptChange(selectedEntity.id, value)}
            onRun={handleRunBotScript}
          />
        )
      : null;

  return (
    <>
      <main ref={shellRef} className="app-shell" data-testid="app-shell">
        <section className="world-view" aria-label="World viewport" data-testid="world-view">
          <div className="world-surface" data-testid="world-surface">
            <div className="world-grid" aria-hidden="true" />
            {entities.map(renderEntity)}
          </div>
        </section>
        <div className={edgeClassName} data-testid="panel-edge">
          <div
            role="separator"
            aria-label="Resize details panel"
            aria-orientation="vertical"
            data-testid="panel-resize-handle"
            tabIndex={-1}
            className={handleClassName}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={handleLostPointerCapture}
          />
          <button
            type="button"
            data-role="panel-toggle"
            data-testid="panel-toggle"
            aria-controls="panel-body"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand details panel' : 'Collapse details panel'}
            className="panel-toggle"
            onClick={toggleCollapsed}
          />
        </div>
        <EntityDetails
          collapsed={collapsed}
          panelClassName={panelClassName}
          selectedEntity={selectedEntity}
          actionPanel={scriptConsole}
        />
      </main>
      {telemetry ? (
        <>
          <button
            type="button"
            className="dev-inspector__toggle"
            data-testid="inspector-toggle"
            onClick={toggleInspector}
          >
            {inspectorOpen ? 'Hide Inspector' : 'Show Inspector'}
          </button>
          <TelemetryInspector
            open={inspectorOpen}
            telemetry={telemetry}
            world={world}
            onRequestClose={toggleInspector}
          />
        </>
      ) : null}
    </>
  );
};

export default App;
