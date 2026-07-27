"use client";

import type { Game } from "@/lib/types";
import { cellKey } from "@/lib/types";

interface BoardProps {
  game: Game;
  onPickCell: (cat: number, row: number) => void;
}

export default function Board({ game, onPickCell }: BoardProps) {
  const board = game.config.boards[game.currentBoard];
  const categories = board.categories;
  const pointValues = board.pointValues;

  return (
    <div className="w-full h-full p-4">
      <div
        className="grid gap-2 h-full"
        style={{
          gridTemplateColumns: `repeat(${categories.length}, 1fr)`,
          gridTemplateRows: `auto repeat(${pointValues.length}, 1fr)`,
        }}
      >
        {/* Category headers */}
        {categories.map((category, catIndex) => (
          <div
            key={`cat-${catIndex}`}
            className="bg-jeopardy-blue flex items-center justify-center p-4 text-center border-2 border-jeopardy-blue-dark rounded-sm shadow-[inset_0_-2px_4px_rgba(0,0,0,0.3)]"
          >
            <h2 className="font-display text-white text-xl md:text-2xl lg:text-3xl leading-tight uppercase font-bold">
              {category.name}
            </h2>
          </div>
        ))}

        {/* Value cells */}
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
                  relative overflow-hidden rounded-sm
                  border-4
                  ${
                    isUsed
                      ? "bg-jeopardy-dark border-jeopardy-blue-dark cursor-default"
                      : "bg-jeopardy-blue border-jeopardy-gold cursor-pointer hover:bg-jeopardy-blue-dark hover:scale-105 focus:outline-none focus:ring-4 focus:ring-jeopardy-gold transition-all duration-200 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.4),0_6px_12px_rgba(0,0,0,0.5)]"
                  }
                `}
              >
                {!isUsed && (
                  <span className="font-display text-jeopardy-gold text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    ${pointValue}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
