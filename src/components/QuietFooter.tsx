import { Link } from "react-router-dom";
import { BoardLogo } from "@/components/BoardLogo";

export function QuietFooter() {
  return (
    <footer className="board-public-section board-public">
      <div className="board-page-width mx-auto grid gap-8 px-4 py-10 md:grid-cols-[minmax(0,1fr)_auto] md:px-6 lg:px-8">
        <div className="space-y-4">
          <BoardLogo tone="dark" wordmarkClassName="text-[30px] md:text-[36px]" />
          <p className="board-public-copy max-w-[34rem] text-[0.98rem]">
            Start local first. When the table fills up, open rooms and keep the bracket attached.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#5d5d5d] md:justify-end">
          <a
            href="https://discord.gg/67EmmZu69q"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#0a0a0a]"
          >
            Discord
          </a>
          <Link to="/worlds" className="transition-colors hover:text-[#0a0a0a]">
            Worlds
          </Link>
          <Link to="/events" className="transition-colors hover:text-[#0a0a0a]">
            Events
          </Link>
          <Link to="/docs" className="transition-colors hover:text-[#0a0a0a]">
            Manual
          </Link>
          <Link to="/privacy" className="transition-colors hover:text-[#0a0a0a]">
            Privacy
          </Link>
          <span className="board-public-label text-[#5d5d5d]">BOARD / 2026</span>
        </div>
      </div>
    </footer>
  );
}
