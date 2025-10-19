import type { ChangeEvent } from 'react';
import { useMemo } from 'react';
import type { BotScriptRunResult } from '../types/botScript';

interface BotScriptConsoleProps {
  entityName: string;
  script: string;
  status: BotScriptRunResult;
  canRun: boolean;
  onScriptChange(value: string): void;
  onRun(): void;
}

const formatTime = (timestamp: number) => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return formatter.format(new Date(timestamp));
};

const REFERENCE = [
  {
    module: 'motor',
    label: 'Motion',
    commands: [
      { signature: 'motor.forward(distance)', description: 'Move forward by the distance in units.' },
      { signature: 'motor.backwards(distance)', description: 'Move backwards by the distance in units.' },
      { signature: 'motor.left(angle)', description: 'Rotate counter-clockwise by angle degrees.' },
      { signature: 'motor.right(angle)', description: 'Rotate clockwise by angle degrees.' },
    ],
  },
  {
    module: 'debug',
    label: 'Debug',
    commands: [
      { signature: 'debug.pen(enabled)', description: 'Enable or disable pen tracing (`true` / `false`).' },
      { signature: 'debug.color(#rrggbb)', description: 'Set the trace color using a hex code.' },
    ],
  },
];

export const BotScriptConsole = ({
  entityName,
  script,
  status,
  canRun,
  onScriptChange,
  onRun,
}: BotScriptConsoleProps) => {
  const { statusLabel, statusClass, detailItems } = useMemo(() => {
    if (status.status === 'success') {
      const { heading, position, debug, timestamp } = status;
      const label = `Success · ${formatTime(timestamp)}`;
      const headingText = `Heading: ${heading.toFixed(1)}°`;
      const positionText = `Position: (${position.x.toFixed(2)}, ${position.y.toFixed(2)})`;
      const penText = `Pen: ${debug.penDown ? 'down' : 'up'} · Color: ${debug.color}`;
      const history = debug.history.length
        ? `History: ${debug.history.join(', ')}`
        : 'History: none';
      return {
        statusLabel: label,
        statusClass: 'script-console__status script-console__status--success',
        detailItems: [headingText, positionText, penText, history],
      };
    }

    if (status.status === 'error') {
      return {
        statusLabel: `Error · ${formatTime(status.timestamp)} · ${status.message}`,
        statusClass: 'script-console__status script-console__status--error',
        detailItems: [],
      };
    }

    if (status.status === 'running') {
      return {
        statusLabel: `Running… · ${formatTime(status.timestamp)}`,
        statusClass: 'script-console__status script-console__status--running',
        detailItems: [],
      };
    }

    return {
      statusLabel: `Write a script for ${entityName} and run it to see results.`,
      statusClass: 'script-console__status',
      detailItems: [],
    };
  }, [entityName, status]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onScriptChange(event.target.value);
  };

  return (
    <div className="script-console" data-testid="bot-script-console">
      <p className="script-console__intro">
        Issue module commands to <strong>{entityName}</strong>. Scripts run immediately against the active bot.
      </p>
      <textarea
        value={script}
        onChange={handleChange}
        rows={10}
        spellCheck={false}
        className="script-console__editor"
        data-testid="bot-script-editor"
        aria-label={`Script editor for ${entityName}`}
      />
      <div className="script-console__actions">
        <button
          type="button"
          className="script-console__button"
          onClick={onRun}
          disabled={!canRun}
          data-testid="bot-script-run"
        >
          Run script
        </button>
        <span className={statusClass} data-testid="bot-script-status">
          {statusLabel}
        </span>
      </div>
      {detailItems.length > 0 ? (
        <ul className="script-console__summary" data-testid="bot-script-summary">
          {detailItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <div className="script-console__reference">
        <span className="script-console__reference-title">Command reference</span>
        <div className="script-console__reference-grid">
          {REFERENCE.map((section) => (
            <div key={section.module} className="script-console__reference-section">
              <span className="script-console__reference-module">{section.module}</span>
              <ul>
                {section.commands.map((command) => (
                  <li key={command.signature}>
                    <code>{command.signature}</code>
                    <span>{command.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
