import { useState } from "react";
import { gameAudio } from "../audio/audioDirector";

export function AudioToggle() {
  const [muted, setMuted] = useState(() => gameAudio.isMuted());

  const toggle = () => {
    const nextMuted = gameAudio.toggleMuted();
    setMuted(nextMuted);
    if (!nextMuted) {
      void gameAudio.unlock().then((ready) => {
        if (ready) gameAudio.play("ui-confirm");
      });
    }
  };

  return (
    <button
      className={`audio-toggle${muted ? " audio-toggle--muted" : ""}`}
      type="button"
      aria-label={muted ? "Turn game sound on" : "Turn game sound off"}
      aria-pressed={!muted}
      onClick={toggle}
    >
      <span aria-hidden="true">{muted ? "◇" : "◆"}</span>
      <span>{muted ? "SOUND OFF" : "SOUND ON"}</span>
    </button>
  );
}
