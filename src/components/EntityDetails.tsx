import type { WorldEntity } from '../types/entity';

interface EntityDetailsProps {
  collapsed: boolean;
  panelClassName: string;
  selectedEntity: WorldEntity | null;
}

const formatUptime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
};

export const EntityDetails = ({ collapsed, panelClassName, selectedEntity }: EntityDetailsProps) => (
  <aside className={panelClassName} data-testid="info-panel" aria-hidden={collapsed}>
    <header className="panel-header">
      <h2 className="panel-title">Entity Details</h2>
    </header>
    <section className="panel-body" id="panel-body">
      <p>Choose an entity in the world to inspect its modules and runtime state.</p>
      <dl className="panel-selection">
        <dt>Selection</dt>
        <dd data-testid="selection-name">
          {selectedEntity ? selectedEntity.name : 'No entity selected.'}
        </dd>
      </dl>
      {selectedEntity ? (
        <>
          <dl className="panel-selection">
            <dt>Status</dt>
            <dd data-testid="selection-status">{selectedEntity.status}</dd>
          </dl>
          <div className="panel-section" data-testid="selection-modules">
            <h3 className="panel-section__title">Modules</h3>
            <ul className="module-list">
              {selectedEntity.modules.map((module) => (
                <li key={module.id} className="module-list__item" data-module-id={module.id}>
                  <div className="module-list__header">
                    <span className="module-list__name">{module.name}</span>
                    <span className={`module-badge category-${module.category}`} data-module-category>
                      {module.category}
                    </span>
                  </div>
                  <p className="module-list__description">{module.description}</p>
                  <span className={`module-state state-${module.state}`} data-module-state>
                    {module.state}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel-section" data-testid="selection-lifecycle">
            <h3 className="panel-section__title">Lifecycle</h3>
            <dl className="panel-selection">
              <dt>Last heartbeat</dt>
              <dd>{selectedEntity.lifecycle.lastHeartbeat}</dd>
            </dl>
            <dl className="panel-selection">
              <dt>Uptime</dt>
              <dd>{formatUptime(selectedEntity.lifecycle.uptimeSeconds)}</dd>
            </dl>
            <p className="panel-note">{selectedEntity.lifecycle.notes}</p>
          </div>
          <div className="panel-section" data-testid="selection-telemetry">
            <h3 className="panel-section__title">Telemetry</h3>
            <dl className="telemetry-grid">
              <div>
                <dt>Battery</dt>
                <dd>{selectedEntity.telemetry.batteryLevel}%</dd>
              </div>
              <div>
                <dt>Temperature</dt>
                <dd>{selectedEntity.telemetry.temperatureC.toFixed(1)}°C</dd>
              </div>
            </dl>
          </div>
          <div className="panel-section panel-placeholder" data-testid="selection-actions">
            <h3 className="panel-section__title">Actions</h3>
            <p>Action controls will appear here once scripting commands are wired in.</p>
          </div>
        </>
      ) : null}
    </section>
  </aside>
);
