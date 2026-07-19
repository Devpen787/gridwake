export type PolicyKind = "terms" | "privacy" | "community";

type PolicyScreenProps = Readonly<{
  kind: PolicyKind;
  onBack: () => void;
}>;

const CONTENT: Record<PolicyKind, Readonly<{
  title: string;
  intro: string;
  sections: readonly Readonly<{ heading: string; body: string }>[];
}>> = {
  terms: {
    title: "PROTOTYPE TERMS",
    intro: "Effective 19 July 2026. These terms govern this free GRIDWAKE hackathon preview.",
    sections: [
      { heading: "ELIGIBILITY + ACCEPTANCE", body: "You must be at least 18. By using Solo or entering a peer room, you accept these Terms, the Privacy Notice, and the Community Rules. If you disagree, do not play." },
      { heading: "THE SERVICE", body: "GRIDWAKE is an experimental cooperative game. There are no purchases, prizes, tokens, wagering, rankings, or paid advantages. Peer rooms use direct browser connections and a player host; they are not server-authoritative." },
      { heading: "YOUR INSTINCT", body: "You keep rights in text you write. You grant the other room members a temporary license to receive and simulate it for that room. Do not submit personal, confidential, illegal, infringing, or abusive content." },
      { heading: "FAIR PLAY", body: "Do not impersonate others, guess or disrupt rooms, forge clients, automate spam, exploit defects, attack peers or signaling infrastructure, or interfere with another player’s device or connection." },
      { heading: "AVAILABILITY + RISK", body: "This is a preview provided as-is. Rooms can fail because of browsers, networks, relays, NAT, host departure, or defects. Do not rely on GRIDWAKE for safety-critical, financial, or permanent records." },
      { heading: "ENFORCEMENT + CHANGES", body: "Access may be limited for abuse or security. The preview, rules, or mechanics may change. Material changes will be dated here. Mandatory rights under applicable law are not excluded." },
    ],
  },
  privacy: {
    title: "PRIVACY NOTICE",
    intro: "GRIDWAKE has no account system or operator gameplay database. Peer play is not data-free.",
    sections: [
      { heading: "ROOM DATA", body: "Your callsign, Instinct text, role, ready state, commands, seed, and replay checkpoints are sent to room peers. They are held in browser memory for the room. Lobby recovery state may remain in your own sessionStorage until you leave or the browser session ends." },
      { heading: "NETWORK DATA", body: "WebRTC and discovery require connection metadata. Nostr signaling relays and STUN infrastructure may process IP addresses, timestamps, encrypted session descriptions, and room-discovery traffic. Direct peers may be able to infer network-address information. GRIDWAKE does not control third-party infrastructure logs." },
      { heading: "PURPOSE + SHARING", body: "Data is used only to connect the room, validate its host-ordered log, run the round, and detect desync. Room data is shared with the peers you join. It is not sold, used for ads, or used to train a model by this prototype." },
      { heading: "RETENTION + CONTROL", body: "The prototype has no central room archive. Leaving clears GRIDWAKE’s saved recovery record for that room. You can also clear site data in your browser. Other peers may retain screenshots or recordings outside GRIDWAKE’s control." },
      { heading: "AGE + SENSITIVE DATA", body: "The preview is for adults 18+. Do not enter real names, contact details, secrets, health, financial, location, or other sensitive information in a callsign or Instinct." },
      { heading: "QUESTIONS", body: "For this hackathon preview, use the contact method on the GRIDWAKE Devpost submission. A named operator, jurisdiction, and dedicated privacy contact must replace this line before any production release." },
    ],
  },
  community: {
    title: "COMMUNITY RULES",
    intro: "Make the room intense, not hostile.",
    sections: [
      { heading: "BUILD TOGETHER", body: "Use a readable callsign, contribute a real Instinct, respect role ownership, and let the shared result stand. There is no individual leaderboard to game." },
      { heading: "NO ABUSE", body: "No harassment, hate, threats, sexual content, doxxing, impersonation, scams, illegal content, malware instructions, or attempts to expose another player’s private information." },
      { heading: "NO DISRUPTION", body: "Do not brute-force room codes, flood messages, forge peer identity, tamper with checkpoints, intentionally desync the game, or attack relays, browsers, networks, or devices." },
      { heading: "ROOM CONTROL", body: "The creator is the temporary room host. Host departure freezes a live room rather than silently electing a new authority. Leave immediately if another player makes the room unsafe." },
      { heading: "REPORTING", body: "This preview does not yet provide in-game reporting or centralized moderation. Preserve a non-sensitive screenshot and use the Devpost contact route. For imminent danger, contact the appropriate local service—not GRIDWAKE." },
    ],
  },
};

export function PolicyScreen({ kind, onBack }: PolicyScreenProps) {
  const policy = CONTENT[kind];
  return (
    <section className="policy screen" aria-labelledby="policy-title">
      <header className="screen-header">
        <button className="text-action" type="button" onClick={onBack}>← BACK</button>
        <span>GRIDWAKE / {kind.toUpperCase()}</span>
        <span className="truth-label truth-label--inline">HACKATHON PREVIEW</span>
      </header>
      <article className="policy__document">
        <p className="step-index">RULES OF THE GRID</p>
        <h1 id="policy-title">{policy.title}</h1>
        <p className="policy__intro">{policy.intro}</p>
        {policy.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </section>
        ))}
        <p className="policy__draft">PREVIEW NOTICE · NOT A SUBSTITUTE FOR PRODUCTION LEGAL REVIEW</p>
      </article>
    </section>
  );
}
