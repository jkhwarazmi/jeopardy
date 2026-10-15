"use client";

import type { Game } from "@/lib/types";
import { cellKey } from "@/lib/types";
import { money } from "@/lib/format";

interface BoardProps {
  game: Game;
  onPickCell: (cat: number, row: number) => void;
}

export default function Board({ game, onPickCell }: BoardProps) {
  const board = game.config.boards[game.currentBoard];
  const categories = board.categories;
  const pointValues = board.pointValues;

  return (
    <div className="w-full h-full p-4 min-h-0">
      <div className="bg-black/60 rounded-lg p-3 h-full min-h-0">
        <div
          className="grid gap-2 md:gap-3 h-full min-h-0"
          style={{
            gridTemplateColumns: `repeat(${categories.length}, 1fr)`,
            gridTemplateRows: `auto repeat(${pointValues.length}, 1fr)`,
          }}
        >
          {categories.map((category, catIndex) => (
            <div
              key={`cat-${catIndex}`}
              className="board-cell flex items-center justify-center p-2 text-center overflow-hidden"
            >
              <h2 className="font-display text-white clue-shadow text-[clamp(1rem,2.5vw,2rem)] leading-[1.1] uppercase break-words">
                {category.name}
              </h2>
            </div>
          ))}

          {pointValues.map((pointValue, rowIndex) =>
            categories.map((_, catIndex) => {
              const key = cellKey(game.currentBoard, catIndex, rowIndex);
              const isUsed = game.usedCells.includes(key);

              return (
                <button
                  key={key}
                  onClick={() => !isUsed && onPickCell(catIndex, rowIndex)}
                  disabled={isUsed}
                  className={`
                    relative overflow-hidden rounded-sm transition-all duration-200
                    ${
                      isUsed
                        ? "board-cell-used cursor-default"
                        : "board-cell cursor-pointer hover:scale-[1.02] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-jeopardy-gold"
                    }
                  `}
                >
                  {!isUsed && (
                    <span className="font-display text-money text-[clamp(1.5rem,4.5vw,4.5rem)]">
                      {money(pointValue)}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}