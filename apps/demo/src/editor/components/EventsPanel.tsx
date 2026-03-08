import { useMemo, useState } from "react";
import type {
  CanvasPointerEventType,
  NodeAction,
  NodeEventBindings,
} from "@yoga-canvas/core";
import { Trash2 } from "lucide-react";
import { Button } from "../../components/Button";
import {
  IconButton,
  Section,
  SelectField,
  TextAreaField,
} from "./property-controls";
import { LABEL_BLOCK_CLASS, TEXT_INPUT_WHITE_CLASS } from "./property-controls/styles";

const EVENT_TYPE_OPTIONS: CanvasPointerEventType[] = [
  "click",
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
  "wheel",
];

export default function EventsPanel({
  events,
  onEventsChange,
}: {
  events: NodeEventBindings | undefined;
  onEventsChange: (events: NodeEventBindings | undefined) => void;
}) {
  const [activeEventType, setActiveEventType] =
    useState<CanvasPointerEventType>("click");

  const activeActions: NodeAction[] = useMemo(
    () => events?.[activeEventType] ?? [],
    [events, activeEventType],
  );

  const createDefaultAction = (type: NodeAction["type"]): NodeAction => {
    if (type === "emit") return { type: "emit", event: "customEvent" };
    return { type: "playMotion", target: { id: "" } };
  };

  const setActiveActions = (next: NodeAction[]) => {
    const normalized = next.filter(Boolean);
    const base = { ...(events ?? {}) } as NodeEventBindings;
    const nextEvents = { ...base } as Record<string, NodeAction[]>;
    if (normalized.length === 0) {
      delete nextEvents[activeEventType];
    } else {
      nextEvents[activeEventType] = normalized;
    }
    const hasAny = Object.keys(nextEvents).some(
      (k) => Array.isArray(nextEvents[k]) && nextEvents[k].length > 0,
    );
    onEventsChange(hasAny ? (nextEvents as NodeEventBindings) : undefined);
  };

  return (
    <Section title="Events">
      <div className="space-y-3">
        <SelectField
          label="Event Type"
          value={activeEventType}
          options={EVENT_TYPE_OPTIONS}
          onChange={(val) => setActiveEventType(val as CanvasPointerEventType)}
        />

        {activeActions.length === 0 ? (
          <p className="text-xs text-gray-400">No actions</p>
        ) : (
          <div className="space-y-2">
            {activeActions.map((action, index) => {
              const setAction = (next: NodeAction) =>
                setActiveActions(
                  activeActions.map((current, i) => (i === index ? next : current)),
                );
              const removeAction = () =>
                setActiveActions(activeActions.filter((_, i) => i !== index));

              const actionTypeOptions = [
                "playMotion",
                "emit",
              ] satisfies NodeAction["type"][];

              return (
                <div
                  key={index}
                  className="rounded-md border border-gray-200 bg-gray-50 p-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <SelectField
                        label="Type"
                        value={action.type}
                        options={actionTypeOptions}
                        onChange={(val) =>
                          setAction(createDefaultAction(val as NodeAction["type"]))
                        }
                      />
                    </div>
                    <div className="pt-5 shrink-0">
                      <IconButton title="Remove" onClick={removeAction}>
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>

                  {"target" in action ? (
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className={LABEL_BLOCK_CLASS}>Target ID</label>
                        <input
                          className={TEXT_INPUT_WHITE_CLASS}
                          value={action.target.id ?? ""}
                          onChange={(e) =>
                            setAction({
                              ...action,
                              target: { ...action.target, id: e.target.value },
                            })
                          }
                          placeholder="yoga_1"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className={LABEL_BLOCK_CLASS}>Event</label>
                        <input
                          className={TEXT_INPUT_WHITE_CLASS}
                          value={action.event}
                          onChange={(e) =>
                            setAction({ ...action, event: e.target.value })
                          }
                          placeholder="eventName"
                        />
                      </div>
                      <TextAreaField
                        label="Payload (JSON)"
                        value={
                          action.payload === undefined
                            ? ""
                            : JSON.stringify(action.payload, null, 2)
                        }
                        rows={4}
                        onChange={(val) => {
                          if (!val.trim()) {
                            setAction({ ...action, payload: undefined });
                            return;
                          }
                          try {
                            const parsed = JSON.parse(val);
                            setAction({ ...action, payload: parsed });
                          } catch {
                            setAction({ ...action, payload: action.payload });
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Button
          variant="default"
          size="sm"
          onClick={() =>
            setActiveActions([...activeActions, createDefaultAction("playMotion")])
          }
        >
          Add Action
        </Button>
      </div>
    </Section>
  );
}

