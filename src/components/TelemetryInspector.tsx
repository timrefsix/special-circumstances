import { useMemo } from 'react';
import type { WorldTelemetry } from '../ecs/telemetry';
import { useWorldTelemetrySnapshot } from '../ecs/telemetry';
import { useEcsQuery, Identity } from '../ecs';
import type { World } from '../ecs/world';

interface TelemetryInspectorProps {
  open: boolean;
  telemetry?: WorldTelemetry;
  world: World;
  onRequestClose(): void;
}

const formatEvent = (
  event: ReturnType<typeof useWorldTelemetrySnapshot>['events'][number],
  entityName: string | null,
) => {
  if (event.type === 'system-run') {
    if (event.phase === 'start') {
      return `System ${event.system} started (tick ${event.tick ?? 0})`;
    }

    const duration = event.durationMs?.toFixed(2) ?? 'n/a';
    return `System ${event.system} finished in ${duration}ms`;
  }

  const label = entityName ? `${entityName} (#${event.entity})` : `Entity #${event.entity}`;

  if (event.type === 'entity-created') {
    return `${label} created`;
  }

  if (event.type === 'entity-destroyed') {
    return `${label} destroyed (${event.components.length} components removed)`;
  }

  return `${label} ${event.changeType} ${event.component.name}`;
};

export const TelemetryInspector = ({
  open,
  telemetry,
  world,
  onRequestClose,
}: TelemetryInspectorProps) => {
  const snapshot = useWorldTelemetrySnapshot(telemetry && open ? telemetry : undefined);
  const identityResults = useEcsQuery(world, [Identity] as const, (entity, identity) => ({
    entity,
    id: identity.id,
    name: identity.name,
  }));

  const identityLookup = useMemo(() => {
    const map = new Map<number, { id: string; name: string }>();
    for (const item of identityResults) {
      map.set(item.entity, { id: item.id, name: item.name });
    }
    return map;
  }, [identityResults]);

  const entityActivity = useMemo(() => {
    return Object.entries(snapshot.entityEventCounts)
      .map(([entityKey, count]) => {
        const entityId = Number.parseInt(entityKey, 10);
        const identity = identityLookup.get(entityId) ?? null;
        return {
          entityId,
          count,
          label: identity ? `${identity.name} (${identity.id})` : `Entity #${entityKey}`,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [snapshot.entityEventCounts, identityLookup]);

  const systemActivity = useMemo(() => {
    return Object.entries(snapshot.systemRuns)
      .map(([system, stats]) => ({
        system,
        runs: stats.runs,
        average: stats.runs > 0 ? stats.totalDurationMs / stats.runs : 0,
        lastDuration: stats.lastDurationMs ?? 0,
      }))
      .sort((a, b) => b.runs - a.runs || b.lastDuration - a.lastDuration)
      .slice(0, 6);
  }, [snapshot.systemRuns]);

  const recentEvents = useMemo(() => {
    return snapshot.events
      .slice(-12)
      .reverse()
      .map((event) => {
        const identity = identityLookup.get(event.type === 'system-run' ? -1 : Number(event.entity)) ?? null;
        const name = event.type === 'system-run' ? null : identity?.name ?? null;
        return {
          event,
          label: formatEvent(event, name),
          ts: event.timestamp,
        };
      });
  }, [snapshot.events, identityLookup]);

  return (
    <div
      className={open ? 'dev-inspector is-open' : 'dev-inspector'}
      data-testid="telemetry-inspector"
      aria-hidden={!open}
    >
      <header className="dev-inspector__header">
        <span className="dev-inspector__title">Telemetry Inspector</span>
        <div className="dev-inspector__actions">
          <span className="dev-inspector__summary">Total events: {snapshot.totalEvents}</span>
          <button
            type="button"
            className="dev-inspector__button"
            onClick={() => telemetry?.clear()}
            disabled={!telemetry}
          >
            Clear
          </button>
          <button type="button" className="dev-inspector__button" onClick={onRequestClose}>
            Close
          </button>
        </div>
      </header>
      <div className="dev-inspector__body">
        <section className="dev-inspector__section">
          <h3 className="dev-inspector__section-title">Entity Activity</h3>
          {entityActivity.length === 0 ? (
            <p className="dev-inspector__empty">No entity activity recorded yet.</p>
          ) : (
            <ul className="dev-inspector__list">
              {entityActivity.map((entry) => (
                <li key={entry.entityId}>
                  <span>{entry.label}</span>
                  <span className="dev-inspector__metric">{entry.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="dev-inspector__section">
          <h3 className="dev-inspector__section-title">System Runs</h3>
          {systemActivity.length === 0 ? (
            <p className="dev-inspector__empty">No system telemetry captured.</p>
          ) : (
            <ul className="dev-inspector__list">
              {systemActivity.map((entry) => (
                <li key={entry.system}>
                  <span>{entry.system}</span>
                  <span className="dev-inspector__metric">
                    {entry.runs} runs · avg {entry.average.toFixed(2)}ms
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="dev-inspector__section">
          <h3 className="dev-inspector__section-title">Recent Events</h3>
          {recentEvents.length === 0 ? (
            <p className="dev-inspector__empty">Event stream is idle.</p>
          ) : (
            <ul className="dev-inspector__events">
              {recentEvents.map((entry, index) => (
                <li key={`${entry.ts}-${index}`}>
                  <span>{entry.label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
