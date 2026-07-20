import { ROUND_SECONDS } from "../game/types";
import { CoreMark } from "./CoreMark";
import type { PolicyKind } from "./PolicyScreen";

type LandingScreenProps = Readonly<{
  onSolo: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onPolicy: (kind: PolicyKind) => void;
}>;

export function LandingScreen({ onSolo, onCreateRoom, onJoinRoom, onPolicy }: LandingScreenProps) {
  return (
    <section className="landing screen" aria-labelledby="gridwake-title">
      <div className="truth-label">LOCAL PROTOTYPE</div>
      <div className="landing__center">
        <CoreMark size="large" />
        <div className="landing__copy">
          <h1 id="gridwake-title">GRIDWAKE</h1>
          <p>ONE SENTENCE. ONE LIGHT. ONE SHARED GRID.</p>
        </div>
        <nav className="mode-list" aria-label="Choose a game mode">
          <button className="mode-action mode-action--primary" type="button" onClick={onSolo}>
            <span>SOLO</span>
            <small>ARCHITECT THREE INSTINCTS</small>
          </button>
          <button className="mode-action" type="button" onClick={onCreateRoom}>
            <span>CREATE ROOM</span>
            <small>2-3 PLAYERS · PEER TO PEER</small>
          </button>
          <button className="mode-action" type="button" onClick={onJoinRoom}>
            <span>JOIN ROOM</span>
            <small>ENTER A SIX-DIGIT CODE</small>
          </button>
        </nav>
      </div>
      <footer className="landing__footer">
        <span>{ROUND_SECONDS} SECONDS</span>
        <span>ONE PULSE</span>
        <span>SHARED SURVIVAL</span>
      </footer>
      <nav className="landing__legal" aria-label="Policies">
        <button type="button" onClick={() => onPolicy("terms")}>TERMS</button>
        <button type="button" onClick={() => onPolicy("privacy")}>PRIVACY</button>
        <button type="button" onClick={() => onPolicy("community")}>COMMUNITY</button>
      </nav>
    </section>
  );
}
