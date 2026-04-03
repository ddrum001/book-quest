'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { THEMES, type ThemeConfig } from '@/lib/types'

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = 'scramble' | 'waiting' | 'hangman' | 'quiz' | 'summary'

interface Tile { id: string; letter: string }
interface HangmanPuzzle { word: string; clue: string }
interface QuizQuestion { q: string; options: string[]; answer: string }
interface GameData { hangman: HangmanPuzzle[]; quiz: QuizQuestion[] }

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeTiles(word: string): Tile[] {
  return word.toUpperCase().split('').map((letter, i) => ({ id: String(i), letter }))
}

function scrambleTiles(word: string): Tile[] {
  const tiles = makeTiles(word)
  let result: Tile[]
  let tries = 0
  do {
    result = [...tiles]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    tries++
  } while (
    result.map(t => t.letter).join('') === word.toUpperCase() &&
    word.length > 1 &&
    tries < 20
  )
  return result
}

// ── Hangman drawing ───────────────────────────────────────────────────────────

const MAX_WRONG = 6

function HangmanDrawing({ wrong }: { wrong: number }) {
  return (
    <svg viewBox="0 0 100 120" width="110" height="110" aria-hidden>
      {/* base */}
      <line x1="5" y1="115" x2="75" y2="115" stroke="#8B7355" strokeWidth="4" strokeLinecap="round" />
      {/* pole */}
      <line x1="25" y1="115" x2="25" y2="8" stroke="#8B7355" strokeWidth="4" strokeLinecap="round" />
      {/* arm */}
      <line x1="25" y1="8" x2="63" y2="8" stroke="#8B7355" strokeWidth="4" strokeLinecap="round" />
      {/* rope */}
      <line x1="63" y1="8" x2="63" y2="22" stroke="#8B7355" strokeWidth="3" strokeLinecap="round" />
      {/* head */}
      {wrong >= 1 && <circle cx="63" cy="32" r="10" fill="none" stroke="#C8860A" strokeWidth="3" />}
      {/* body */}
      {wrong >= 2 && <line x1="63" y1="42" x2="63" y2="75" stroke="#C8860A" strokeWidth="3" strokeLinecap="round" />}
      {/* left arm */}
      {wrong >= 3 && <line x1="63" y1="52" x2="46" y2="65" stroke="#C8860A" strokeWidth="3" strokeLinecap="round" />}
      {/* right arm */}
      {wrong >= 4 && <line x1="63" y1="52" x2="80" y2="65" stroke="#C8860A" strokeWidth="3" strokeLinecap="round" />}
      {/* left leg */}
      {wrong >= 5 && <line x1="63" y1="75" x2="46" y2="96" stroke="#C8860A" strokeWidth="3" strokeLinecap="round" />}
      {/* right leg */}
      {wrong >= 6 && <line x1="63" y1="75" x2="80" y2="96" stroke="#C8860A" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  )
}

// ── Word Scramble ─────────────────────────────────────────────────────────────

function ScrambleGame({
  vocab,
  theme,
  onDone,
}: {
  vocab: { word: string; hint: string }[]
  theme: ThemeConfig
  onDone: (coins: number, perfect: boolean) => void
}) {
  const [wordIdx, setWordIdx] = useState(0)
  const [pool, setPool] = useState<Tile[]>([])
  const [answer, setAnswer] = useState<(Tile | null)[]>([])
  const [status, setStatus] = useState<'playing' | 'correct' | 'wrong'>('playing')
  const coinsRef = useRef(0)
  const solvedRef = useRef(0)
  const totalRef = useRef(vocab.length)

  const word = vocab[wordIdx]?.word ?? ''
  const hint = vocab[wordIdx]?.hint ?? ''

  // Reset tiles whenever the word changes
  useEffect(() => {
    if (!word) return
    setPool(scrambleTiles(word))
    setAnswer(Array(word.length).fill(null))
    setStatus('playing')
  }, [word])

  // Auto-check when all answer slots are filled
  useEffect(() => {
    if (status !== 'playing') return
    if (answer.some(t => t === null)) return
    const guess = answer.map(t => t!.letter).join('')
    if (guess === word.toUpperCase()) {
      setStatus('correct')
      setTimeout(() => {
        coinsRef.current += 5
        solvedRef.current += 1
        if (wordIdx + 1 < vocab.length) {
          setWordIdx(i => i + 1)
        } else {
          onDone(coinsRef.current, solvedRef.current === totalRef.current)
        }
      }, 900)
    } else {
      setStatus('wrong')
      setTimeout(() => {
        setPool(scrambleTiles(word))
        setAnswer(Array(word.length).fill(null))
        setStatus('playing')
      }, 700)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, status])

  function tapPool(tile: Tile) {
    if (status !== 'playing') return
    const firstEmpty = answer.indexOf(null)
    if (firstEmpty === -1) return
    setPool(prev => prev.filter(t => t.id !== tile.id))
    setAnswer(prev => {
      const next = [...prev]
      next[firstEmpty] = tile
      return next
    })
  }

  function tapAnswer(i: number) {
    if (status !== 'playing') return
    const tile = answer[i]
    if (!tile) return
    setAnswer(prev => { const n = [...prev]; n[i] = null; return n })
    setPool(prev => [...prev, tile])
  }

  if (!word) return null

  return (
    <div className="flex flex-col bg-parchment min-h-screen">
      <header className="shrink-0 px-6 pt-8 pb-2 text-center">
        <p className="text-[11px] font-heading font-semibold text-ink-muted tracking-widest mb-1">GAME 1 OF 3</p>
        <h1 className="text-2xl font-heading font-bold text-ink">Word Scramble</h1>
        <p className="text-sm font-body text-ink-light mt-0.5">Unscramble the story words!</p>
      </header>

      {/* Word progress dots */}
      <div className="flex justify-center gap-2 mt-3 mb-2">
        {vocab.map((_, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full transition-colors"
            style={{ backgroundColor: i < wordIdx ? theme.color : i === wordIdx ? theme.color + '80' : '#E5E0D8' }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-7">
        {/* Hint card */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-center w-full max-w-sm">
          <p className="text-[10px] font-heading text-amber-700 font-semibold tracking-widest mb-0.5">VOCAB CLUE</p>
          <p className="font-body text-ink text-sm leading-snug">{hint}</p>
        </div>

        {/* Answer slots */}
        <div className="flex gap-2 flex-wrap justify-center">
          {answer.map((tile, i) => (
            <button
              key={i}
              onClick={() => tapAnswer(i)}
              className={`w-11 h-11 rounded-xl border-2 font-heading font-bold text-lg flex items-center justify-center transition-all active:scale-95
                ${tile
                  ? status === 'correct'
                    ? 'bg-green-100 border-green-400 text-green-700'
                    : status === 'wrong'
                    ? 'bg-red-100 border-red-400 text-red-700 animate-pulse'
                    : 'bg-white text-ink'
                  : 'bg-white/50 border-dashed text-transparent'
                }`}
              style={tile && status === 'playing' ? { borderColor: theme.color } : {}}
            >
              {tile?.letter ?? '·'}
            </button>
          ))}
        </div>

        {/* Letter pool */}
        <div className="flex gap-2 flex-wrap justify-center min-h-[52px]">
          {pool.map(tile => (
            <button
              key={tile.id}
              onClick={() => tapPool(tile)}
              className="w-11 h-11 rounded-xl border-2 bg-white font-heading font-bold text-lg text-ink shadow-sm active:scale-95 transition-all"
              style={{ borderColor: theme.color + '50' }}
            >
              {tile.letter}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {status === 'correct' && (
          <p className="text-xl font-heading font-bold text-green-600">✓ Correct! +5 🪙</p>
        )}
        {status === 'wrong' && (
          <p className="text-base font-heading font-semibold text-red-500">Not quite — try again!</p>
        )}

        <p className="text-sm font-heading text-ink-light">
          Coins so far: <span className="font-bold" style={{ color: theme.color }}>{coinsRef.current} 🪙</span>
        </p>
      </div>
    </div>
  )
}

// ── Hangman ───────────────────────────────────────────────────────────────────

const ALPHA_ROWS = ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', 'VWXYZ']

function HangmanGame({
  puzzles,
  theme,
  onDone,
}: {
  puzzles: HangmanPuzzle[]
  theme: ThemeConfig
  onDone: (coins: number) => void
}) {
  const [puzzleIdx, setPuzzleIdx] = useState(0)
  const [guessed, setGuessed] = useState<Set<string>>(new Set())
  const [resolved, setResolved] = useState(false)
  const coinsRef = useRef(0)

  const puzzle = puzzles[puzzleIdx]
  const word = (puzzle?.word ?? '').toUpperCase()
  const wrongGuesses = [...guessed].filter(l => !word.includes(l))
  const wrongCount = wrongGuesses.length
  const isWon = word.length > 0 && word.split('').every(l => guessed.has(l))
  const isLost = wrongCount >= MAX_WRONG

  // Win / lose handler
  useEffect(() => {
    if (resolved || (!isWon && !isLost)) return
    setResolved(true)
    const coins = isWon ? Math.max(2, 10 - wrongCount * 2) : 0

    setTimeout(() => {
      coinsRef.current += coins
      if (puzzleIdx + 1 < puzzles.length) {
        setPuzzleIdx(i => i + 1)
        setGuessed(new Set())
        setResolved(false)
      } else {
        onDone(coinsRef.current)
      }
    }, isWon ? 1200 : 2000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWon, isLost, resolved])

  function guess(letter: string) {
    if (guessed.has(letter) || isWon || isLost) return
    setGuessed(prev => new Set([...prev, letter]))
  }

  if (!puzzle) return null

  return (
    <div className="flex flex-col bg-parchment min-h-screen">
      <header className="shrink-0 px-6 pt-8 pb-2 text-center">
        <p className="text-[11px] font-heading font-semibold text-ink-muted tracking-widest mb-1">GAME 2 OF 3</p>
        <h1 className="text-2xl font-heading font-bold text-ink">Hangman</h1>
        {puzzles.length > 1 && (
          <p className="text-sm font-body text-ink-light mt-0.5">Word {puzzleIdx + 1} of {puzzles.length}</p>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center px-6 gap-4 pt-3 pb-6 overflow-y-auto">
        {/* Drawing */}
        <HangmanDrawing wrong={wrongCount} />

        {/* Clue */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-center w-full max-w-sm">
          <p className="text-[10px] font-heading text-amber-700 font-semibold tracking-widest mb-0.5">CLUE</p>
          <p className="font-body text-ink text-sm leading-snug">{puzzle.clue}</p>
        </div>

        {/* Word blanks */}
        <div className="flex gap-2 flex-wrap justify-center">
          {word.split('').map((letter, i) => {
            const revealed = guessed.has(letter) || isLost
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span
                  className={`font-heading font-bold text-xl w-8 text-center leading-none
                    ${revealed
                      ? isLost && !guessed.has(letter) ? 'text-red-500' : 'text-ink'
                      : 'text-transparent'
                    }`}
                >
                  {letter}
                </span>
                <div className="w-8 h-0.5 bg-ink-muted rounded" />
              </div>
            )
          })}
        </div>

        {/* Status message */}
        {isWon && <p className="text-xl font-heading font-bold text-green-600">🎉 Got it! +{Math.max(2, 10 - wrongCount * 2)} 🪙</p>}
        {isLost && <p className="text-xl font-heading font-bold text-red-500">The word was &ldquo;{puzzle.word}&rdquo;</p>}

        {/* Wrong count */}
        {!isWon && !isLost && (
          <p className="text-sm font-heading text-ink-muted">
            Wrong guesses: {wrongCount} / {MAX_WRONG}
          </p>
        )}

        {/* Alphabet keyboard */}
        <div className="w-full max-w-xs mt-1">
          {ALPHA_ROWS.map(row => (
            <div key={row} className="flex justify-center gap-1.5 mb-1.5">
              {row.split('').map(letter => {
                const isGuessed = guessed.has(letter)
                const isRight = word.includes(letter) && isGuessed
                const isWrong = !word.includes(letter) && isGuessed
                return (
                  <button
                    key={letter}
                    onClick={() => guess(letter)}
                    disabled={isGuessed || isWon || isLost}
                    className={`w-9 h-9 rounded-lg font-heading font-bold text-sm transition-all active:scale-95
                      ${isRight
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : isWrong
                        ? 'bg-red-50 text-red-300 border border-red-200'
                        : 'bg-white border border-gold/30 text-ink'
                      }
                      disabled:cursor-default`}
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <p className="text-sm font-heading text-ink-light">
          Coins so far: <span className="font-bold" style={{ color: theme.color }}>{coinsRef.current} 🪙</span>
        </p>
      </div>
    </div>
  )
}

// ── Story Quiz ────────────────────────────────────────────────────────────────

function QuizGame({
  questions,
  theme,
  onDone,
}: {
  questions: QuizQuestion[]
  theme: ThemeConfig
  onDone: (coins: number, perfect: boolean) => void
}) {
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const coinsRef = useRef(0)
  const correctRef = useRef(0)

  const q = questions[qIdx]

  function pick(option: string) {
    if (selected || !q) return
    setSelected(option)
    const isCorrect = option === q.answer
    if (isCorrect) {
      coinsRef.current += 5
      correctRef.current += 1
    }
    setTimeout(() => {
      if (qIdx + 1 < questions.length) {
        setQIdx(i => i + 1)
        setSelected(null)
      } else {
        onDone(coinsRef.current, correctRef.current === questions.length)
      }
    }, 1400)
  }

  if (!q) return null

  const progressPct = (qIdx / questions.length) * 100

  return (
    <div className="flex flex-col bg-parchment min-h-screen">
      <header className="shrink-0 px-6 pt-8 pb-4 text-center">
        <p className="text-[11px] font-heading font-semibold text-ink-muted tracking-widest mb-1">GAME 3 OF 3</p>
        <h1 className="text-2xl font-heading font-bold text-ink">Story Quiz</h1>
        <p className="text-sm font-body text-ink-light mt-0.5">
          Question {qIdx + 1} of {questions.length}
        </p>
      </header>

      <div className="flex-1 flex flex-col px-6 gap-5 pb-8">
        {/* Progress bar */}
        <div className="h-2 bg-white rounded-full overflow-hidden border border-gold/20">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, backgroundColor: theme.color }}
          />
        </div>

        {/* Question */}
        <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
          <p className="font-heading font-bold text-ink text-lg leading-snug">{q.q}</p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {q.options.map(option => {
            const isSelected = selected === option
            const showCorrect = !!selected && option === q.answer
            const showWrong = isSelected && option !== q.answer
            return (
              <button
                key={option}
                onClick={() => pick(option)}
                disabled={!!selected}
                className={`w-full text-left px-5 py-4 rounded-2xl font-heading font-semibold text-sm border-2 transition-all active:scale-95
                  ${showCorrect
                    ? 'bg-green-100 border-green-400 text-green-800'
                    : showWrong
                    ? 'bg-red-100 border-red-400 text-red-700'
                    : selected
                    ? 'bg-white border-gold/20 text-ink-muted'
                    : 'bg-white border-gold/30 text-ink'
                  }
                  disabled:cursor-default`}
              >
                {showCorrect && '✓ '}{showWrong && '✗ '}{option}
              </button>
            )
          })}
        </div>

        <p className="text-sm font-heading text-ink-light text-center">
          Score: <span className="font-bold" style={{ color: theme.color }}>
            {correctRef.current}/{qIdx + (selected ? 1 : 0)}
          </span>
          {' · '}
          Coins: <span className="font-bold" style={{ color: theme.color }}>{coinsRef.current} 🪙</span>
        </p>
      </div>
    </div>
  )
}

// ── Summary ───────────────────────────────────────────────────────────────────

function GamesSummary({
  scrambleCoins,
  hangmanCoins,
  quizCoins,
  bonusStars,
  theme,
  claiming,
  onClaim,
}: {
  scrambleCoins: number
  hangmanCoins: number
  quizCoins: number
  bonusStars: number
  theme: ThemeConfig
  claiming: boolean
  onClaim: () => void
}) {
  const total = scrambleCoins + hangmanCoins + quizCoins
  return (
    <div className="flex flex-col bg-parchment min-h-screen">
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
        <div className="text-7xl animate-bounce">🎮</div>
        <div>
          <h1 className="text-3xl font-heading font-bold text-ink">Games Complete!</h1>
          <p className="text-ink-light font-body mt-1">Amazing job — here&apos;s what you earned!</p>
        </div>

        <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-gold/20 shadow-sm text-left">
          <p className="text-[10px] font-heading font-semibold text-ink-muted tracking-widest mb-4 text-center">
            GAME BONUS
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-body text-ink text-sm">🔤 Word Scramble</span>
              <span className="font-heading font-bold text-gold">+{scrambleCoins} 🪙</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-ink text-sm">🪢 Hangman</span>
              <span className="font-heading font-bold text-gold">+{hangmanCoins} 🪙</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-ink text-sm">📝 Story Quiz</span>
              <span className="font-heading font-bold text-gold">+{quizCoins} 🪙</span>
            </div>
            <div className="border-t border-gold/20 pt-3 flex items-center justify-between">
              <span className="font-heading font-bold text-ink">Total Bonus</span>
              <span className="font-heading font-bold text-xl" style={{ color: theme.color }}>
                +{total} 🪙
              </span>
            </div>
            {bonusStars > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-body text-ink text-sm">Bonus Stars</span>
                <span className="font-heading font-bold text-gold">
                  +{bonusStars} {'⭐'.repeat(bonusStars)}
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onClaim}
          disabled={claiming}
          className="w-full max-w-xs text-white font-heading font-bold text-xl py-5 rounded-3xl shadow-lg active:scale-95 transition-transform disabled:opacity-60"
          style={{ backgroundColor: theme.color }}
        >
          {claiming ? 'Saving…' : 'Claim All Rewards! 🏆'}
        </button>
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

function GamesScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const themeId = searchParams.get('theme') ?? 'dragon-kingdom'
  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]

  const [creditChecked, setCreditChecked] = useState(false)
  const [phase, setPhase] = useState<Phase>('scramble')
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [fetchDone, setFetchDone] = useState(false)
  const [vocab, setVocab] = useState<{ word: string; hint: string }[]>([])
  const gameDataRef = useRef<GameData | null>(null)

  // Scores
  const [scrambleCoins, setScrambleCoins] = useState(0)
  const [hangmanCoins, setHangmanCoins] = useState(0)
  const [quizCoins, setQuizCoins] = useState(0)
  const [perfectScramble, setPerfectScramble] = useState(false)
  const [perfectQuiz, setPerfectQuiz] = useState(false)
  const [claiming, setClaiming] = useState(false)

  // Pending phase — used when we need to wait for fetchDone before advancing
  const [pendingPhase, setPendingPhase] = useState<Phase | null>(null)

  // Consume one game play credit — redirect home if none available
  useEffect(() => {
    const userId = localStorage.getItem('bookquest_user_id')
    if (!userId) { router.replace('/'); return }
    fetch('/api/start-games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) router.replace('/')
        else setCreditChecked(true)
      })
      .catch(() => setCreditChecked(true)) // allow through on network error
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch game data in background while Erin plays scramble
  useEffect(() => {
    const raw = sessionStorage.getItem('bookquest_game_data')
    if (!raw) { setFetchDone(true); return }

    const { storyText, vocab: v } = JSON.parse(raw)
    setVocab(v ?? [])

    const timeout = setTimeout(() => setFetchDone(true), 14_000)

    fetch('/api/game-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyText, vocab: v }),
    })
      .then(r => r.json())
      .then(data => {
        gameDataRef.current = data
        setGameData(data)
        setFetchDone(true)
      })
      .catch(() => setFetchDone(true))
      .finally(() => clearTimeout(timeout))

    return () => clearTimeout(timeout)
  }, [])

  // When fetch completes and we were waiting, advance to the right phase
  useEffect(() => {
    if (!fetchDone || !pendingPhase) return
    setPendingPhase(null)
    const data = gameDataRef.current
    if (pendingPhase === 'hangman') {
      setPhase(data?.hangman?.length ? 'hangman' : data?.quiz?.length ? 'quiz' : 'summary')
    } else if (pendingPhase === 'quiz') {
      setPhase(data?.quiz?.length ? 'quiz' : 'summary')
    } else {
      setPhase(pendingPhase)
    }
  }, [fetchDone, pendingPhase])

  const afterScramble = useCallback((coins: number, perfect: boolean) => {
    setScrambleCoins(coins)
    setPerfectScramble(perfect)
    const data = gameDataRef.current
    if (fetchDone || data) {
      setPhase(data?.hangman?.length ? 'hangman' : data?.quiz?.length ? 'quiz' : 'summary')
    } else {
      setPhase('waiting')
      setPendingPhase('hangman')
    }
  }, [fetchDone])

  const afterHangman = useCallback((coins: number) => {
    setHangmanCoins(coins)
    const data = gameDataRef.current
    if (fetchDone || data) {
      setPhase(data?.quiz?.length ? 'quiz' : 'summary')
    } else {
      setPhase('waiting')
      setPendingPhase('quiz')
    }
  }, [fetchDone])

  const afterQuiz = useCallback((coins: number, perfect: boolean) => {
    setQuizCoins(coins)
    setPerfectQuiz(perfect)
    setPhase('summary')
  }, [])

  async function handleClaim() {
    setClaiming(true)
    const bonusCoins = scrambleCoins + hangmanCoins + quizCoins
    const bonusStars = perfectQuiz ? 2 : 1 // finishing all games always earns ≥1 star

    const userId = localStorage.getItem('bookquest_user_id')
    if (userId) {
      await fetch('/api/claim-game-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, bonusCoins, bonusStars, perfectScramble, perfectQuiz }),
      }).catch(() => {})
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set('gameCoins', String(bonusCoins))
    params.set('gameStars', String(bonusStars))
    router.push(`/reward?${params.toString()}`)
  }

  // Credit check loading screen
  if (!creditChecked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-parchment gap-5">
        <div className="text-6xl animate-bounce">🎮</div>
        <p className="text-xl font-heading font-semibold text-ink animate-pulse">
          Loading games…
        </p>
      </div>
    )
  }

  // Waiting screen (rare — only if scramble completes before API responds)
  if (phase === 'waiting') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-parchment gap-5">
        <div className="text-6xl animate-bounce">🎮</div>
        <p className="text-xl font-heading font-semibold text-ink animate-pulse">
          Getting your next game…
        </p>
      </div>
    )
  }

  if (phase === 'scramble') {
    const scrambleVocab = vocab.length ? vocab.slice(0, 1) : [{ word: 'story', hint: 'A tale you just read' }]
    return (
      <ScrambleGame
        vocab={scrambleVocab}
        theme={theme}
        onDone={afterScramble}
      />
    )
  }

  if (phase === 'hangman' && gameData?.hangman?.length) {
    return (
      <HangmanGame
        puzzles={gameData.hangman.slice(0, 1)}
        theme={theme}
        onDone={afterHangman}
      />
    )
  }

  if (phase === 'quiz' && gameData?.quiz?.length) {
    return (
      <QuizGame
        questions={gameData.quiz.slice(0, 1)}
        theme={theme}
        onDone={afterQuiz}
      />
    )
  }

  const bonusStars = perfectQuiz ? 2 : 1

  return (
    <GamesSummary
      scrambleCoins={scrambleCoins}
      hangmanCoins={hangmanCoins}
      quizCoins={quizCoins}
      bonusStars={bonusStars}
      theme={theme}
      claiming={claiming}
      onClaim={handleClaim}
    />
  )
}

export default function GamesPage() {
  return (
    <Suspense>
      <GamesScreen />
    </Suspense>
  )
}
