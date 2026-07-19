import { useState } from "react";
import { normalizeRoomCode } from "../multiplayer/room";
import { CoreMark } from "./CoreMark";
import type { PolicyKind } from "./PolicyScreen";

type RoomEntryScreenProps = Readonly<{
  mode: "create" | "join";
  initialCode: string;
  error: string | null;
  onBack: () => void;
  onSubmit: (displayName: string, code: string) => void;
  onPolicy: (kind: PolicyKind) => void;
}>;

export function RoomEntryScreen({ mode, initialCode, error, onBack, onSubmit, onPolicy }: RoomEntryScreenProps) {
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState(normalizeRoomCode(initialCode));
  const valid = displayName.trim().length > 0 && (mode === "create" || code.length === 6);

  return (
    <section className="room-entry screen" aria-labelledby="room-entry-title">
      <header className="screen-header">
        <button className="text-action" type="button" onClick={onBack}>← BACK</button>
        <span>{mode === "create" ? "CREATE ROOM" : "JOIN ROOM"}</span>
        <span className="truth-label truth-label--inline">P2P BETA</span>
      </header>
      <div className="room-entry__card">
        <CoreMark size="small" />
        <p className="step-index">MULTIPLAYER / IDENTITY</p>
        <h1 id="room-entry-title">{mode === "create" ? "OPEN A GRID." : "ENTER THE GRID."}</h1>
        <p>No account. Your callsign exists only for this room.</p>
        <label className="room-field">
          <span>CALLSIGN</span>
          <input
            autoFocus
            maxLength={24}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="NOVA"
          />
        </label>
        {mode === "join" ? (
          <label className="room-field">
            <span>ROOM CODE</span>
            <input
              inputMode="text"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
              placeholder="ABC234"
            />
          </label>
        ) : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <p className="room-consent">
          BY CONTINUING YOU ACCEPT <button type="button" onClick={() => onPolicy("terms")}>TERMS</button>
          {" + "}<button type="button" onClick={() => onPolicy("privacy")}>PRIVACY</button>.
        </p>
        <button className="primary-action" type="button" disabled={!valid} onClick={() => onSubmit(displayName.trim(), code)}>
          {mode === "create" ? "CREATE GRID →" : "JOIN GRID →"}
        </button>
      </div>
    </section>
  );
}
