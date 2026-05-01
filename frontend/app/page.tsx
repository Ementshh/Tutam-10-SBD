'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type HistoryItem = {
  id: number;
  target_word: string;
  attempts: number;
  is_win: boolean;
  created_at: string;
};

type LetterStatus = 'correct' | 'present' | 'absent';
type GameStatus = 'loading' | 'ready' | 'won' | 'lost' | 'error';

const keyboardRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const specialKeys = ['ENTER', 'DEL'];

const boardSize = 6;
const wordLength = 5;

const statusPriority: Record<LetterStatus, number> = {
  absent: 1,
  present: 2,
  correct: 3,
};

const createEmptyBoard = () =>
  Array.from({ length: boardSize }, () => Array.from({ length: wordLength }, () => ''));

const createEmptyCellStatuses = () =>
  Array.from({ length: boardSize }, () => Array.from({ length: wordLength }, () => null));

export default function Home() {
  const [boardState, setBoardState] = useState<string[][]>(createEmptyBoard());
  const [cellStatuses, setCellStatuses] = useState<(LetterStatus | null)[][]>(
    createEmptyCellStatuses()
  );
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [currentGuess, setCurrentGuess] = useState('');
  const [targetWord, setTargetWord] = useState('');
  const [gameStatus, setGameStatus] = useState<GameStatus>('ready');
  const [errorMessage, setErrorMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const didSendHistoryRef = useRef(false);

  useEffect(() => {
    const loadTargetWord = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error('API URL is not configured');
        }

        const response = await fetch(`${apiUrl}/api/word/random`);
        const data = (await response.json()) as {
          success?: boolean;
          word?: string;
          message?: string;
        };

        if (!response.ok || !data.success || !data.word) {
          throw new Error(data.message || 'Failed to load target word');
        }

        setTargetWord(data.word.toLowerCase());
      } catch {
        setErrorMessage('Failed to load target word. Please refresh the page.');
        setGameStatus('error');
      }
    };

    loadTargetWord();
  }, []);

  const attemptsUsed = gameStatus === 'won' || gameStatus === 'lost' ? currentRowIndex + 1 : 0;
  const isInputLocked = gameStatus !== 'ready';

  useEffect(() => {
    if (gameStatus !== 'won' && gameStatus !== 'lost') {
      return;
    }

    if (didSendHistoryRef.current || !targetWord) {
      return;
    }

    didSendHistoryRef.current = true;

    const sendHistory = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error('API URL is not configured');
        }

        await fetch(`${apiUrl}/api/history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetWord,
            attempts: attemptsUsed,
            isWin: gameStatus === 'won',
          }),
        });
      } catch (error) {
        console.error('Failed to save game history', error);
      }
    };

    sendHistory();
  }, [attemptsUsed, gameStatus, targetWord]);

  const updateBoardRow = useCallback((rowIndex: number, guess: string) => {
    setBoardState((previous) => {
      const next = previous.map((row) => [...row]);
      const nextRow = Array.from({ length: wordLength }, (_, columnIndex) => guess[columnIndex] ?? '');
      next[rowIndex] = nextRow;
      return next;
    });
  }, []);

  const submitGuess = useCallback(() => {
    if (gameStatus !== 'ready' || targetWord.length !== wordLength || currentGuess.length !== wordLength) {
      return;
    }

    const guess = currentGuess.toLowerCase();
    const target = targetWord.toLowerCase();
    const nextCellStatuses = Array.from({ length: wordLength }, () => null as LetterStatus | null);
    const targetLetterCounts = new Map<string, number>();

    for (const letter of target) {
      targetLetterCounts.set(letter, (targetLetterCounts.get(letter) ?? 0) + 1);
    }

    for (let index = 0; index < wordLength; index += 1) {
      if (guess[index] === target[index]) {
        nextCellStatuses[index] = 'correct';
        targetLetterCounts.set(guess[index], (targetLetterCounts.get(guess[index]) ?? 0) - 1);
      }
    }

    for (let index = 0; index < wordLength; index += 1) {
      if (nextCellStatuses[index]) {
        continue;
      }

      const currentLetter = guess[index];
      const remainingCount = targetLetterCounts.get(currentLetter) ?? 0;

      if (remainingCount > 0) {
        nextCellStatuses[index] = 'present';
        targetLetterCounts.set(currentLetter, remainingCount - 1);
      } else {
        nextCellStatuses[index] = 'absent';
      }
    }

    setCellStatuses((previous) => {
      const next = previous.map((row) => [...row]);
      next[currentRowIndex] = nextCellStatuses;
      return next;
    });

    if (guess === target) {
      setGameStatus('won');
      return;
    }

    if (currentRowIndex === boardSize - 1) {
      setGameStatus('lost');
      return;
    }

    setCurrentRowIndex((previous) => previous + 1);
    setCurrentGuess('');
  }, [currentGuess, currentRowIndex, gameStatus, targetWord]);

  const handleInput = useCallback(
    (key: string) => {
      if (gameStatus !== 'ready') {
        return;
      }

      if (/^[A-Z]$/.test(key)) {
        if (currentGuess.length >= wordLength) {
          return;
        }

        const nextGuess = `${currentGuess}${key.toLowerCase()}`;
        setCurrentGuess(nextGuess);
        updateBoardRow(currentRowIndex, nextGuess);
        return;
      }

      if (key === 'DEL') {
        const nextGuess = currentGuess.slice(0, -1);
        setCurrentGuess(nextGuess);
        updateBoardRow(currentRowIndex, nextGuess);
        return;
      }

      if (key === 'ENTER') {
        submitGuess();
      }
    },
    [currentGuess, currentRowIndex, gameStatus, submitGuess, updateBoardRow]
  );

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Backspace') {
        event.preventDefault();
        handleInput('DEL');
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        handleInput('ENTER');
        return;
      }

      if (/^[a-zA-Z]$/.test(event.key)) {
        handleInput(event.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyboard);

    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleInput]);

  return (
    <main className="h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top,#f8f4ea,#e9e4d8_45%,#ddd6c9)] text-zinc-900 flex flex-col items-center justify-between">
      <div className="flex h-full w-full max-w-3xl flex-col items-center justify-between">
        <header className="flex w-full flex-col items-center gap-2 pt-6 pb-2 text-center shrink-0">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">
            Wordle Tapi Kata2nya mpruy2
          </p>
          <h1 className="text-4xl font-black tracking-[0.2em] text-zinc-900 sm:text-5xl">
            WORDLE
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-600">
            <span className="rounded-full border border-zinc-300 bg-white/70 px-3 py-1 shadow-sm">
              Row {currentRowIndex + 1} of 6
            </span>
            <span className="rounded-full border border-zinc-300 bg-white/70 px-3 py-1 shadow-sm">
              Guess length {currentGuess.length}/5
            </span>
            <span className="rounded-full border border-zinc-300 bg-white/70 px-3 py-1 shadow-sm">
              {!targetWord && 'Loading word...'}
              {targetWord && gameStatus === 'ready' && 'Ready to play'}
              {gameStatus === 'won' && 'Solved!'}
              {gameStatus === 'lost' && 'Game over'}
              {gameStatus === 'error' && 'Error'}
            </span>
            <button
              onClick={() => setShowHistory(true)}
              className="rounded-full border border-zinc-300 bg-white/70 px-3 py-1 shadow-sm transition-colors hover:bg-zinc-100"
            >
              View History
            </button>
          </div>
        </header>

        <section className="flex w-full flex-grow items-center justify-center min-h-0 overflow-hidden">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          ) : (
            <WordleGrid
              boardState={boardState}
              cellStatuses={cellStatuses}
              currentRowIndex={currentRowIndex}
            />
          )}
        </section>

        {!errorMessage && (
          <section className="w-full max-w-3xl pb-4">
            <WordleKeyboard
              keyboardRows={keyboardRows}
              specialKeys={specialKeys}
              guesses={boardState.slice(0, currentRowIndex).map(row => row.join(''))}
              targetWord={targetWord}
              onKeyPress={handleInput}
              disabled={isInputLocked}
            />
          </section>
        )}

        {gameStatus === 'won' || gameStatus === 'lost' ? (
          <GameOverModal
            isWin={gameStatus === 'won'}
            targetWord={targetWord}
            attemptsUsed={attemptsUsed}
          />
        ) : null}

        {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
      </div>
    </main>
  );
}

function WordleGrid({
  boardState,
  cellStatuses,
  currentRowIndex,
}: {
  boardState: string[][];
  cellStatuses: (LetterStatus | null)[][];
  currentRowIndex: number;
}) {
  return (
    <div className="grid grid-rows-6 gap-2 w-full max-w-[350px] mx-auto">
      {boardState.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-5 gap-2">
          {row.map((letter, columnIndex) => {
            const isCurrentRow = rowIndex === currentRowIndex;
            const status = cellStatuses[rowIndex][columnIndex];

            const statusClassName =
              status === 'correct'
                ? 'border-green-600 bg-green-600 text-white'
                : status === 'present'
                  ? 'border-yellow-500 bg-yellow-500 text-white'
                  : status === 'absent'
                    ? 'border-gray-500 bg-gray-500 text-white'
                    : isCurrentRow && letter
                      ? 'border-zinc-400 bg-white text-zinc-900 shadow-sm scale-[1.02]'
                      : 'border-zinc-300 bg-white/50 text-zinc-900';

            return (
              <div
                key={`${rowIndex}-${columnIndex}`}
                className={`flex w-full aspect-square max-w-[4rem] max-h-[4rem] mx-auto items-center justify-center rounded-xl border-2 text-3xl font-bold leading-none uppercase transition-all duration-200 ${statusClassName}`}
              >
                {letter}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function WordleKeyboard({
  keyboardRows,
  specialKeys,
  guesses,
  targetWord,
  onKeyPress,
  disabled,
}: {
  keyboardRows: string[];
  specialKeys: string[];
  guesses: string[];
  targetWord: string;
  onKeyPress: (key: string) => void;
  disabled: boolean;
}) {
  const getStatuses = () => {
    const statuses: Record<string, 'correct' | 'present' | 'absent'> = {};
    
    guesses.forEach((guess) => {
      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i].toUpperCase();
        const targetLetter = targetWord[i]?.toUpperCase();
        
        if (letter === targetLetter) {
          statuses[letter] = 'correct';
        } else if (targetWord.toUpperCase().includes(letter) && statuses[letter] !== 'correct') {
          statuses[letter] = 'present';
        } else if (!targetWord.toUpperCase().includes(letter) && statuses[letter] !== 'correct' && statuses[letter] !== 'present') {
          statuses[letter] = 'absent';
        }
      }
    });
    
    return statuses;
  };

  const keyStatuses = getStatuses();

  const getKeyClass = (key: string) => {
    const status = keyStatuses[key];
    const baseClassName = 'flex h-12 min-w-[2.5rem] items-center justify-center rounded-lg px-2 py-1 text-xs font-bold uppercase transition-all active:scale-95 shadow-sm';
    
    if (status === 'correct') return `${baseClassName} bg-green-600 text-white`;
    if (status === 'present') return `${baseClassName} bg-yellow-500 text-white`;
    if (status === 'absent') return `${baseClassName} bg-gray-600 text-white`;
    return `${baseClassName} bg-gray-200 text-black`; // Default
  };

  const getSpecialKeyClass = () => {
    return 'flex h-12 min-w-16 items-center justify-center rounded-lg px-2 py-1 text-xs font-bold uppercase transition-all active:scale-95 shadow-sm bg-gray-200 text-black';
  };

  return (
    <div className="mt-8 flex flex-col gap-3">
      {keyboardRows.map((row) => (
        <div key={row} className="flex justify-center gap-2">
          {row.split('').map((key) => (
            <button
              key={key}
              type="button"
              className={getKeyClass(key)}
              onClick={() => onKeyPress(key)}
              {...(disabled && { disabled: true })}
            >
              {key}
            </button>
          ))}
        </div>
      ))}

      <div className="flex justify-center gap-2">
        {specialKeys.map((key) => (
          <button
            key={key}
            type="button"
            className={getSpecialKeyClass()}
            onClick={() => onKeyPress(key)}
            {...(disabled && { disabled: true })}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}

function GameOverModal({
  isWin,
  targetWord,
  attemptsUsed,
}: {
  isWin: boolean;
  targetWord: string;
  attemptsUsed: number;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-zinc-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-white/40 bg-white p-6 text-center shadow-2xl">
        <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${isWin ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isWin ? 'You Win' : 'You Lose'}
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-[0.2em] text-zinc-900">
          {isWin ? 'Solved' : 'Game Over'}
        </h2>
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          The correct word was{' '}
          <span className="font-bold uppercase tracking-[0.2em] text-zinc-900">
            {targetWord}
          </span>
          .
        </p>
        <div className="mt-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700">
          Attempts used: {attemptsUsed}
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const loadHistory = useCallback(async () => {
    try {
      if (!apiUrl) throw new Error('API URL is not configured');
      setIsLoading(true);
      setErrorMessage('');

      const response = await fetch(`${apiUrl}/api/history`);
      const data = (await response.json()) as { success?: boolean; data?: HistoryItem[]; message?: string };

      if (!response.ok || !data.success || !Array.isArray(data.data)) {
        throw new Error(data.message || 'Failed to load history');
      }

      setItems(data.data);
    } catch {
      setErrorMessage('Failed to load history records.');
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        if (!apiUrl) throw new Error('API URL is not configured');
        const response = await fetch(`${apiUrl}/api/history?id=${id}`, { method: 'DELETE' });
        const data = (await response.json()) as { success?: boolean; message?: string };

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to delete record');
        }
        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch {
        setErrorMessage('Failed to delete the selected history record.');
      }
    },
    [apiUrl]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
      <div className="relative flex h-full max-h-[80vh] w-full max-w-2xl flex-col rounded-3xl border border-white/20 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-zinc-200 p-6 shrink-0">
          <div>
            <h2 className="text-2xl font-black tracking-[0.1em] text-zinc-900">HISTORY</h2>
            <p className="mt-1 text-xs text-zinc-500 font-semibold uppercase tracking-[0.15em]">
              Total games: {items.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
          >
            ✕
          </button>
        </header>

        <div className="flex-grow overflow-y-auto p-6">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          ) : isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Loading history...
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              No game history found yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const date = new Date(item.created_at).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                });
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <span className="font-bold uppercase tracking-[0.2em] text-zinc-900">
                        {item.target_word}
                      </span>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.attempts} attempts • {date}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${
                          item.is_win ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {item.is_win ? 'Win' : 'Lose'}
                      </span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}