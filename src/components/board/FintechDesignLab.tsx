import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Check,
  Clock3,
  Copy,
  Layers3,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type LabFilter = "all" | "live" | "queued" | "verified";

type LabBook = {
  id: string;
  title: string;
  game: string;
  venue: string;
  state: "live" | "queued" | "finals";
  fill: string;
  verified: string;
  start: string;
  mode: string;
  note: string;
  tags: string[];
};

const LAB_FILTERS: Array<{ key: LabFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "queued", label: "Queued" },
  { key: "verified", label: "Verified" },
];

const LAB_BOOKS: LabBook[] = [
  {
    id: "hex-ladder",
    title: "Hex Ladder Night",
    game: "Hex 13x13",
    venue: "Quiet Room 03",
    state: "live",
    fill: "24 / 32",
    verified: "82%",
    start: "Now",
    mode: "Ranked",
    note: "Lead room. Finals rail stays attached.",
    tags: ["public", "swap rule", "venue-linked"],
  },
  {
    id: "chess-finals",
    title: "Open Chess Finals",
    game: "Chess Standard",
    venue: "North Hall",
    state: "live",
    fill: "12 / 16",
    verified: "100%",
    start: "Now",
    mode: "Verified",
    note: "Clean room map. Player verification complete.",
    tags: ["finals", "verified", "broadcast"],
  },
  {
    id: "checkers-open",
    title: "Checkers Open",
    game: "American Standard",
    venue: "Paper Table 08",
    state: "queued",
    fill: "18 / 24",
    verified: "61%",
    start: "7:30 PM",
    mode: "Casual",
    note: "Seats still open. Queue attached to venue.",
    tags: ["casual", "open seats"],
  },
  {
    id: "connect4-rush",
    title: "Connect 4 Rush",
    game: "Classic 7x6",
    venue: "Sprint Rail",
    state: "queued",
    fill: "30 / 32",
    verified: "47%",
    start: "8:05 PM",
    mode: "Open",
    note: "Fast-start bracket. Copy-first invite flow.",
    tags: ["blitz", "quickplay spillover"],
  },
];

const SURFACE_ROWS = [
  { label: "Quickplay", web: true, mobile: true, discord: true },
  { label: "Join live", web: true, mobile: true, discord: true },
  { label: "Spectate", web: true, mobile: true, discord: true },
  { label: "Host-lite", web: true, mobile: true, discord: true },
  { label: "Rules edit", web: true, mobile: false, discord: false },
  { label: "Package upload", web: true, mobile: false, discord: false },
];

function toneForState(state: LabBook["state"]) {
  if (state === "live") return "market-chip market-chip--success";
  if (state === "queued") return "market-chip market-chip--warning";
  return "market-chip";
}

export function FintechDesignLab() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<LabFilter>("all");
  const [selectedId, setSelectedId] = useState(LAB_BOOKS[0].id);

  const filteredBooks = useMemo(() => {
    return LAB_BOOKS.filter((book) => {
      if (filter === "all") return true;
      if (filter === "live") return book.state === "live";
      if (filter === "queued") return book.state === "queued";
      return Number.parseInt(book.verified, 10) >= 80;
    });
  }, [filter]);

  const selectedBook =
    filteredBooks.find((book) => book.id === selectedId) ?? filteredBooks[0] ?? LAB_BOOKS[0];

  const copyVenue = async () => {
    try {
      await navigator.clipboard.writeText(`https://hexology.me/worlds/${selectedBook.id}`);
      toast.success("Venue route copied");
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  return (
    <div className="market-lab-shell">
      <section className="market-surface market-surface--hero">
        <div className="market-hero-grid">
          <div>
            <p className="market-eyebrow">Board setup</p>
            <h2 className="market-display mt-4">Run the room.</h2>
            <p className="market-copy mt-4 max-w-[38rem]">
              Rooms, queues, and verification in one calm surface.
            </p>
          </div>

          <div className="market-kpi-strip" aria-label="Venue summary">
            <div className="market-kpi-inline">
              <p className="market-kpi-label">Live rooms</p>
              <p className="market-kpi-value">14</p>
            </div>
            <div className="market-kpi-inline">
              <p className="market-kpi-label">Queued</p>
              <p className="market-kpi-value">06</p>
            </div>
            <div className="market-kpi-inline">
              <p className="market-kpi-label">Verified</p>
              <p className="market-kpi-value">82%</p>
            </div>
            <div className="market-kpi-inline">
              <p className="market-kpi-label">Hosts</p>
              <p className="market-kpi-value">03</p>
            </div>
          </div>
        </div>
      </section>

      <div className="market-lab-grid">
        <section className="market-surface">
          <div className="market-section-head">
            <div>
              <p className="market-eyebrow">Rooms</p>
              <h3 className="market-section-title mt-3">Live and next</h3>
            </div>
            <div className="market-segmented">
              {LAB_FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={filter === item.key ? "market-segmented__item is-active" : "market-segmented__item"}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="market-list mt-6">
            {filteredBooks.map((book) => {
              const selected = book.id === selectedBook.id;

              return (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => setSelectedId(book.id)}
                  className={selected ? "market-row is-selected" : "market-row"}
                >
                  <div className="market-row__main">
                    <div className="market-row__title-line">
                      <h4 className="market-row__title">{book.title}</h4>
                      <span className={toneForState(book.state)}>{book.state}</span>
                    </div>
                    <p className="market-row__meta">
                      {book.game} / {book.venue}
                    </p>
                    <p className="market-row__note">{book.note}</p>
                  </div>

                  <div className="market-row__stats">
                    <div>
                      <p className="market-row__stat-label">Seats</p>
                      <p className="market-row__stat-value">{book.fill}</p>
                    </div>
                    <div>
                      <p className="market-row__stat-label">Verified</p>
                      <p className="market-row__stat-value">{book.verified}</p>
                    </div>
                    <div>
                      <p className="market-row__stat-label">Start</p>
                      <p className="market-row__stat-value">{book.start}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="market-surface market-surface--detail">
          <div className="market-detail-topline">
            <span className={toneForState(selectedBook.state)}>{selectedBook.state}</span>
            <span className="market-chip">{selectedBook.mode}</span>
          </div>

          <h3 className="market-section-title mt-5">{selectedBook.title}</h3>
          <p className="market-copy mt-3">{selectedBook.note}</p>

          <div className="market-detail-hero">
            <p className="market-detail-hero__label">Seat fill</p>
            <p className="market-detail-hero__value">{selectedBook.fill}</p>
            <p className="market-detail-hero__foot">
              Venue-linked bracket. Verification visible before entry.
            </p>
          </div>

          <div className="market-detail-grid">
            <div className="market-detail-stat">
              <Clock3 className="h-4 w-4" />
              <div>
                <p className="market-detail-stat__label">Start</p>
                <p className="market-detail-stat__value">{selectedBook.start}</p>
              </div>
            </div>
            <div className="market-detail-stat">
              <ShieldCheck className="h-4 w-4" />
              <div>
                <p className="market-detail-stat__label">Verified</p>
                <p className="market-detail-stat__value">{selectedBook.verified}</p>
              </div>
            </div>
            <div className="market-detail-stat">
              <Users className="h-4 w-4" />
              <div>
                <p className="market-detail-stat__label">Venue</p>
                <p className="market-detail-stat__value">{selectedBook.venue}</p>
              </div>
            </div>
            <div className="market-detail-stat">
              <Layers3 className="h-4 w-4" />
              <div>
                <p className="market-detail-stat__label">Variant</p>
                <p className="market-detail-stat__value">{selectedBook.game}</p>
              </div>
            </div>
          </div>

          <div className="market-tag-list">
            {selectedBook.tags.map((tag) => (
              <span key={tag} className="market-chip">
                {tag}
              </span>
            ))}
          </div>

          <div className="market-action-row">
            <button type="button" className="market-action market-action--primary" onClick={() => navigate("/events")}>
              Open event
              <ArrowUpRight className="h-4 w-4" />
            </button>
            <button type="button" className="market-action" onClick={copyVenue}>
              Copy room
              <Copy className="h-4 w-4" />
            </button>
            <button type="button" className="market-action" onClick={() => navigate("/worlds")}>
              Review venue
              <Check className="h-4 w-4" />
            </button>
          </div>
        </aside>
      </div>

      <div className="market-lab-grid market-lab-grid--footer">
        <section className="market-surface">
          <div className="market-section-head">
            <div>
              <p className="market-eyebrow">Surface access</p>
              <h3 className="market-section-title mt-3">Where editing lives</h3>
            </div>
          </div>

          <div className="market-matrix mt-6">
            {SURFACE_ROWS.map((row) => (
              <div key={row.label} className="market-matrix__row">
                <p className="market-matrix__label">{row.label}</p>
                <div className="market-matrix__cells">
                  <span className={row.web ? "market-bool is-true" : "market-bool"}>{row.web ? "Yes" : "No"}</span>
                  <span className={row.mobile ? "market-bool is-true" : "market-bool"}>{row.mobile ? "Yes" : "No"}</span>
                  <span className={row.discord ? "market-bool is-true" : "market-bool"}>{row.discord ? "Yes" : "No"}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="market-surface">
          <div className="market-section-head">
            <div>
              <p className="market-eyebrow">Principles</p>
              <h3 className="market-section-title mt-3">Quiet system rules</h3>
            </div>
          </div>

          <div className="market-notes mt-6">
            <div className="market-note">
              <Activity className="h-4 w-4" />
              <p>Rows carry the surface. The frame should disappear.</p>
            </div>
            <div className="market-note">
              <ShieldCheck className="h-4 w-4" />
              <p>Tone and spacing separate regions before lines do.</p>
            </div>
            <div className="market-note">
              <Users className="h-4 w-4" />
              <p>Big numbers explain state faster than paragraphs do.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default FintechDesignLab;
