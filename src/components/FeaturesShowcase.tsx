import { memo, forwardRef } from "react";
import { cn } from "@/lib/utils";

const venueFacts = [
  {
    label: "MEMBERS",
    value: "Keep invites, roles, and host rights attached to the same place.",
  },
  {
    label: "ROOMS",
    value: "Run casual tables and live matches without rebuilding the setup.",
  },
  {
    label: "BRACKETS",
    value: "Start the next round without losing the room map or the audience.",
  },
] as const;

export const HostWorldThesis = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn("board-public-section py-16 md:py-20", className)}
        {...props}
      >
        <div className="board-page-width board-public mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:gap-16">
            <div className="max-w-[52rem]">
              <p className="board-public-label text-[#5c5750]">WORLD LAYER</p>
              <h2 className="board-public-display mt-5 max-w-[12ch] text-[clamp(2.25rem,4vw,4.35rem)] text-[#0a0a0a]">
                Keep rooms, invites, and brackets together.
              </h2>
            </div>

            <div className="space-y-6">
              <p className="board-public-copy text-[1rem] md:text-[1.08rem]">
                A world sits above the match. Hosts keep the invite link, room list, and event rail attached instead of rebuilding the setup every round.
              </p>
              <p className="board-public-copy text-[1rem] md:text-[1.08rem]">
                Players can see where to sit, what is live, and what starts next before they click in.
              </p>

              <div className="landing-venue-rail">
                {venueFacts.map((fact) => (
                  <div key={fact.label} className="landing-venue-rail__row">
                    <p className="board-public-label text-[#5d5d5d]">{fact.label}</p>
                    <p className="board-public-copy text-[0.98rem] text-[#23252b]">
                      {fact.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }),
);

HostWorldThesis.displayName = "HostWorldThesis";
