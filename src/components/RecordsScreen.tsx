import { useMemo, useState } from "react";
import { campaignSummary, levelById } from "../game/campaign";
import { careerStats, clearRounds, loadRounds, type StoredRound } from "../game/records";
import { CoreMark } from "./CoreMark";

type RecordsScreenProps = Readonly<{
  onBack: () => void;
}>;

function timeAgo(at: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 60) return "JUST NOW";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  return `${Math.floor(hours / 24)}D AGO`;
}

function Sparkline({ scores }: Readonly<{ scores: readonly number[] }>) {
  if (scores.length < 2) return null;
  const width = 240;
  const height = 48;
  const step = width / (scores.length - 1);
  const points = scores
    .map((score, index) => `${(index * step).toFixed(1)},${(height - (score / 100) * height).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      className="records__sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Score trend over last ${scores.length} rounds`}
    >
      <polyline points={points} fill="none" />
      <circle
        cx={(scores.length - 1) * step}
        cy={height - (scores[scores.length - 1] / 100) * height}
        r="3"
      />
    </svg>
  );
}

function roundContext(round: StoredRound): string {
  const level = levelById(round.levelId);
  if (level) return level.name;
  return round.mode === "room" ? "P2P ROOM" : "FREE GRID";
}

export function RecordsScreen({ onBack }: RecordsScreenProps) {
  const [revision, setRevision] = useState(0);
  const [confirmingWipe, setConfirmingWipe] = useState(false);
  const rounds = useMemo(() => loadRounds(), [revision]);
  const career = useMemo(() => careerStats(rounds), [rounds]);
  const ladder = useMemo(() => campaignSummary(rounds), [rounds]);
  const recent = useMemo(() => [...rounds].reverse().slice(0, 25), [rounds]);

  return (
    <section className="records screen" aria-labelledby="records-title">
      <header className="screen-header">
        <button className="text-action" type="button" onClick={onBack}>← EXIT</button>
        <span>OPERATOR / RECORDS</span>
        <span className="truth-label truth-label--inline">LOCAL ARCHIVE</span>
      </header>

      <div className="records__content">
        <CoreMark size="small" />
        <div className="records__heading">
          <p className="step-index">03 / SERVICE RECORD</p>
          <h1 id="records-title">{career.rank}</h1>
          {career.nextRank ? (
            <p className="records__next-rank">
              NEXT RANK {career.nextRank} · {career.nextRankHint}
            </p>
          ) : (
            <p className="records__next-rank">MAXIMUM RANK ACHIEVED</p>
          )}
        </div>

        {rounds.length === 0 ? (
          <p className="records__empty">
            No rounds archived yet. Wake a squad — every resolved round is recorded here,
            on this device only.
          </p>
        ) : (
          <>
            <dl className="records__stats">
              <div><dt>ROUNDS</dt><dd>{career.rounds}</dd></div>
              <div><dt>GRIDS HELD</dt><dd>{career.held} · {career.holdRate}%</dd></div>
              <div><dt>BEST SCORE</dt><dd>{career.bestScore}{career.bestGrade ? ` · ${career.bestGrade}` : ""}</dd></div>
              <div><dt>HOLD STREAK</dt><dd>{career.currentStreak} / BEST {career.bestStreak}</dd></div>
              <div><dt>AVG LAST {career.recentScores.length}</dt><dd>{career.averageRecent}</dd></div>
              <div><dt>LADDER</dt><dd>{ladder.cleared}/{ladder.total} · {ladder.stars}★</dd></div>
            </dl>

            {career.recentScores.length >= 2 ? (
              <div className="records__trend">
                <span>SCORE TREND</span>
                <Sparkline scores={career.recentScores} />
              </div>
            ) : null}

            <div className="records__table-wrap">
              <table className="records__table">
                <thead>
                  <tr>
                    <th scope="col">WHEN</th>
                    <th scope="col">GRID</th>
                    <th scope="col">RESULT</th>
                    <th scope="col">GRADE</th>
                    <th scope="col">SCORE</th>
                    <th scope="col">SENTENCE</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((round) => (
                    <tr key={`${round.at}-${round.replayHash}`}>
                      <td>{timeAgo(round.at)}</td>
                      <td>{roundContext(round)}</td>
                      <td className={round.outcome === "grid-held" ? "records__outcome--held" : "records__outcome--lost"}>
                        {round.outcome === "grid-held" ? "HELD" : "LOST"}
                      </td>
                      <td><span className={`grade-chip grade-chip--${round.grade.toLowerCase()}`}>{round.grade}</span></td>
                      <td>{round.score}</td>
                      <td className="records__sentence" title={round.source}>{round.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="records__actions">
              {confirmingWipe ? (
                <>
                  <span className="records__confirm-label">ERASE ALL LOCAL RECORDS?</span>
                  <button
                    className="secondary-action records__wipe-confirm"
                    type="button"
                    onClick={() => {
                      clearRounds();
                      setConfirmingWipe(false);
                      setRevision((value) => value + 1);
                    }}
                  >
                    ERASE
                  </button>
                  <button className="secondary-action" type="button" onClick={() => setConfirmingWipe(false)}>
                    KEEP
                  </button>
                </>
              ) : (
                <button className="text-action records__wipe" type="button" onClick={() => setConfirmingWipe(true)}>
                  ERASE LOCAL RECORDS
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
