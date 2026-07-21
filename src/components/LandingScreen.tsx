import { useMemo } from "react";
import { ROUND_SECONDS } from "../game/types";
import { campaignSummary } from "../game/campaign";
import { careerStats, loadRounds } from "../game/records";
import { CoreMark } from "./CoreMark";
import type { PolicyKind } from "./PolicyScreen";

type LandingScreenProps = Readonly<{
  onSolo: () => void;
  onCampaign: () => void;
  onRecords: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onPolicy: (kind: PolicyKind) => void;
}>;

export function LandingScreen({ onSolo, onCampaign, onRecords, onCreateRoom, onJoinRoom, onPolicy }: LandingScreenProps) {
  const rounds = useMemo(() => loadRounds(), []);
  const career = useMemo(() => careerStats(rounds), [rounds]);
  const ladder = useMemo(() => campaignSummary(rounds), [rounds]);

  return (
    <section className="landing screen" aria-labelledby="gridwake-title">
      <div className="truth-label">BUILD WEEK PROTOTYPE</div>
      <div className="landing__center">
        <CoreMark size="large" />
        <div className="landing__copy">
          <h1 id="gridwake-title">GRIDWAKE</h1>
          <p>ONE SENTENCE. ONE LIGHT. ONE SHARED GRID.</p>
        </div>
        <nav className="mode-list" aria-label="Choose a game mode">
          <button className="mode-action mode-action--primary" type="button" onClick={onCampaign}>
            <span>CAMPAIGN</span>
            <small>
              {ladder.cleared > 0
                ? `GRID LADDER · ${ladder.cleared}/${ladder.total} HELD · ${ladder.stars}★`
                : "EIGHT GRIDS · EARN STARS"}
            </small>
          </button>
          <button className="mode-action" type="button" onClick={onSolo}>
            <span>FREE GRID</span>
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
        <button className="landing__career" type="button" onClick={onRecords} aria-label="Open service record">
          {career.rounds > 0 ? (
            <>
              <span className="landing__career-rank">{career.rank}</span>
              <span>BEST {career.bestScore}{career.bestGrade ? ` · ${career.bestGrade}` : ""}</span>
              <span>{career.held}/{career.rounds} HELD</span>
              <span className="landing__career-open">RECORDS →</span>
            </>
          ) : (
            <span className="landing__career-open">SERVICE RECORD →</span>
          )}
        </button>
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
