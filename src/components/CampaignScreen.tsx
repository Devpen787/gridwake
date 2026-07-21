import { useMemo } from "react";
import { campaignProgress, campaignSummary, type CampaignLevel } from "../game/campaign";
import { loadRounds } from "../game/records";
import { CoreMark } from "./CoreMark";

type CampaignScreenProps = Readonly<{
  onBack: () => void;
  onSelect: (level: CampaignLevel) => void;
}>;

function Stars({ count }: Readonly<{ count: 0 | 1 | 2 | 3 }>) {
  return (
    <span className="campaign-card__stars" aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((slot) => (
        <i key={slot} className={slot < count ? "campaign-card__star campaign-card__star--lit" : "campaign-card__star"} />
      ))}
    </span>
  );
}

export function CampaignScreen({ onBack, onSelect }: CampaignScreenProps) {
  const rounds = useMemo(() => loadRounds(), []);
  const progress = useMemo(() => campaignProgress(rounds), [rounds]);
  const summary = useMemo(() => campaignSummary(rounds), [rounds]);

  return (
    <section className="campaign screen" aria-labelledby="campaign-title">
      <header className="screen-header">
        <button className="text-action" type="button" onClick={onBack}>← EXIT</button>
        <span>SOLO / CAMPAIGN</span>
        <span className="truth-label truth-label--inline">LOCAL PROGRESS</span>
      </header>

      <div className="campaign__content">
        <CoreMark size="small" />
        <div className="campaign__heading">
          <p className="step-index">02 / GRID LADDER</p>
          <h1 id="campaign-title">EIGHT GRIDS. ONE SENTENCE EACH.</h1>
          <p>
            Hold a grid to unlock the next. Beat par for stars. Every grid is a fixed seed —
            same corruption, every attempt, for every player.
          </p>
        </div>

        <div className="campaign__summary" role="status">
          <span>{summary.cleared} / {summary.total} GRIDS HELD</span>
          <span>{summary.stars} / {summary.maxStars} STARS</span>
        </div>

        <ol className="campaign__ladder">
          {progress.map((entry) => (
            <li key={entry.level.id}>
              <button
                type="button"
                className={[
                  "campaign-card",
                  entry.unlocked ? "" : "campaign-card--locked",
                  entry.held ? "campaign-card--held" : "",
                ].filter(Boolean).join(" ")}
                disabled={!entry.unlocked}
                onClick={() => onSelect(entry.level)}
              >
                <div className="campaign-card__head">
                  <span className="campaign-card__index">{String(entry.level.index + 1).padStart(2, "0")}</span>
                  <strong className="campaign-card__name">{entry.level.name}</strong>
                  <Stars count={entry.stars} />
                </div>
                <p className="campaign-card__brief">{entry.unlocked ? entry.level.brief : "Hold the previous grid to decrypt this sector."}</p>
                <div className="campaign-card__meta">
                  <span>{entry.level.seconds}S ROUND</span>
                  <span>PAR {entry.level.parScore}</span>
                  {entry.bestScore !== null ? (
                    <span className={entry.beatPar ? "campaign-card__best campaign-card__best--par" : "campaign-card__best"}>
                      BEST {entry.bestScore} · {entry.bestGrade}
                    </span>
                  ) : (
                    <span className="campaign-card__best campaign-card__best--empty">
                      {entry.unlocked ? "UNPLAYED" : "LOCKED"}
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
