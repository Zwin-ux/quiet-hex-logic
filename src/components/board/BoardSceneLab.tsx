import { BoardScene, BoardMark, type BoardSceneKey, type BoardSceneState } from "@/components/board/BoardScene";
import { getGameMeta } from "@/lib/gameMetadata";

const GAMES: BoardSceneKey[] = ["hex", "chess", "checkers", "ttt", "connect4"];
const STATES: BoardSceneState[] = ["static", "selected", "loading"];

function getBoardLabel(game: BoardSceneKey) {
  switch (game) {
    case "ttt":
      return "Tic-Tac-Toe";
    case "connect4":
      return "Connect 4";
    default:
      return game.charAt(0).toUpperCase() + game.slice(1);
  }
}

export function BoardSceneLab() {
  return (
    <section className="board-scene-lab">
      <header className="board-scene-lab__head">
        <div>
          <p className="board-scene-lab__label">Board scene pack</p>
          <h1 className="board-scene-lab__title">Core 5 system marks</h1>
        </div>
        <p className="board-scene-lab__note">
          Mono SVG scenes. No color states. No decorative motion.
        </p>
      </header>

      <div className="board-scene-lab__grid">
        {GAMES.map((game) => {
          const meta = getGameMeta(game);

          return (
            <article key={game} className="board-scene-lab__card">
              <div className="board-scene-lab__row">
                <div className="board-scene-lab__badge">
                  <BoardMark game={game} decorative className="h-5 w-5 text-[#090909]" />
                </div>
                <div className="board-scene-lab__copy">
                  <h2 className="board-scene-lab__name">{getBoardLabel(game)}</h2>
                  <p className="board-scene-lab__tagline">{meta.tagline}</p>
                </div>
              </div>

              <div className="board-scene-lab__states">
                {STATES.map((state) => (
                  <div key={state} className="board-scene-lab__state">
                    <div className="board-scene-lab__state-preview">
                      <BoardScene game={game} state={state} decorative className="h-8 w-8 text-[#090909]" />
                    </div>
                    <span className="board-scene-lab__state-label">{state}</span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
