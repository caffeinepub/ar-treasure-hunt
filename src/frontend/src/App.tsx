import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type CameraError, useCamera } from "./camera/useCamera";
import { useARGameplay } from "./hooks/useARGameplay";
import { useActor } from "./hooks/useActor";
import { useAudio } from "./hooks/useAudio";

// ─── Types ───────────────────────────────────────────────────────────────────
type Screen = 1 | 2 | 3 | 4 | 5 | 6;

const CLUES_PER_LEVEL = 5;

const AVATARS = [
  { id: "kid", emoji: "🧒", label: "Explorer" },
  { id: "wizard", emoji: "🧙", label: "Wizard" },
  { id: "robot", emoji: "🤖", label: "Robot" },
  { id: "fox", emoji: "🦊", label: "Fox" },
];

const THEMES = [
  { id: "pirates", emoji: "🏴\u200d☠️", label: "Pirates" },
  { id: "space", emoji: "🚀", label: "Space" },
  { id: "jungle", emoji: "🌿", label: "Jungle" },
  { id: "mystery", emoji: "🔍", label: "Mystery" },
];

const CONFETTI_COLORS = [
  "oklch(0.72 0.2 45)",
  "oklch(0.88 0.19 95)",
  "oklch(0.58 0.19 295)",
  "oklch(0.65 0.18 240)",
  "oklch(0.7 0.22 160)",
];

const FALLBACK_CLUES: Record<string, string[]> = {
  pirates: [
    "Ahoy! Where do pirates keep their treasure chest of clothes? 🏴\u200d☠️",
    "A pirate needs their beauty sleep — where is your sleeping hammock? 🛏️",
    "Shiver me timbers! Where does cold treasure stay fresh? 🧊",
    "Every pirate reads maps! Where do your books hide, matey? 📚",
    "Arrr! Where do you sit when eating your pirate grub? 🍽️",
    "A pirate checks their reflection before battle — where is yer mirror? 🪞",
    "The ship's lantern! Find the light that guides your room! 💡",
    "Yarr! Where do pirates hang their coats when they dock? 🧥",
  ],
  space: [
    "Mission control! Where does the astronaut sleep to recharge? 🚀",
    "The cold storage pod — where is your food kept frozen? 🥶",
    "Space explorers read star charts — where are your books? 📖",
    "The command seat — where do you sit to eat your space rations? 🪑",
    "The observation mirror — where do astronauts check their suit? 🪞",
    "The light beacon — find the lamp that guides your room! 💡",
    "The space wardrobe — where do you store your space suits? 👕",
    "The entry portal — find the door that leads out of your room! 🚪",
  ],
  jungle: [
    "Explorer! Where does the jungle creature sleep safely? 🌴",
    "The watering hole — where does cold water and food get stored? 🌿",
    "Jungle scouts read trail maps — where are your books hidden? 📚",
    "The tribe's eating rock — where do you sit for meals? 🍽️",
    "The jungle pool — where can you see your own reflection? 🪞",
    "The fire torch — find the light in your jungle shelter! 🔦",
    "The vine rack — where do your clothes hang? 👕",
    "The tribe's entrance — find your room's door! 🚪",
  ],
  mystery: [
    "Detective! Where does the sleuth rest their tired mind? 🔍",
    "A detective needs cold evidence storage — where is it? 🕵️",
    "Case files are stored here — where are your books? 📚",
    "The interrogation chair — where do you sit to eat? 🪑",
    "The suspect mirror — where do you check your appearance? 🪞",
    "The clue lamp — find the light source in the room! 💡",
    "The evidence locker — where do clothes get stored? 👕",
    "The secret exit — find the door to leave this room! 🚪",
  ],
};

const FALLBACK_HINTS: Record<string, string[]> = {
  pirates: [
    "It's your wardrobe or dresser — where you keep clothes! 👕",
    "It's your bed — where you sleep every night! 🛏️",
    "It's your refrigerator or fridge — where food stays cold! 🧊",
    "It's your bookshelf — where books are stored! 📚",
    "It's your dining chair or table — where you eat meals! 🍽️",
    "It's a mirror — maybe in the bathroom or bedroom! 🪞",
    "It's a lamp or ceiling light — look up! 💡",
    "It's a coat rack or hook near the door! 🧥",
  ],
  space: [
    "It's your bed — the place you sleep! 🛏️",
    "It's your fridge — where food is kept cold! 🥶",
    "It's your bookshelf — look for stacked books! 📖",
    "It's a chair or dining table! 🪑",
    "It's a mirror — check your bathroom! 🪞",
    "It's a lamp or light — look around the room! 💡",
    "It's your wardrobe or closet! 👕",
    "It's your door — find the way out of the room! 🚪",
  ],
  jungle: [
    "It's your bed — where you rest! 🛏️",
    "It's your fridge — cold food storage! 🌿",
    "It's your bookshelf or book collection! 📚",
    "It's a chair at the dining table! 🍽️",
    "It's a mirror — maybe in the bathroom! 🪞",
    "It's a lamp or light bulb in the room! 🔦",
    "It's your wardrobe or clothes hanger! 👕",
    "It's the door of the room! 🚪",
  ],
  mystery: [
    "It's your bed — where you sleep! 🛏️",
    "It's your fridge or cold storage! 🕵️",
    "It's a bookshelf or book pile! 📚",
    "It's a chair — where you sit to eat! 🪑",
    "It's a mirror — check the bathroom! 🪞",
    "It's a lamp or light in the room! 💡",
    "It's a wardrobe or drawer for clothes! 👕",
    "It's the door leading out of the room! 🚪",
  ],
};

// ─── Confetti piece ───────────────────────────────────────────────────────────
function ConfettiPiece({
  x,
  color,
  delay,
}: { x: number; color: string; delay: number }) {
  return (
    <div
      className="fixed w-3 h-3 rounded-sm pointer-events-none z-50"
      style={{
        left: `${x}%`,
        top: "-20px",
        backgroundColor: color,
        animation: `confetti-fall ${2 + Math.random()}s ${delay}s linear forwards`,
      }}
    />
  );
}

// ─── Screen wrapper ───────────────────────────────────────────────────────────
function ScreenWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="min-h-screen w-full"
    >
      {children}
    </motion.div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { actor } = useActor();
  const [screen, setScreen] = useState<Screen>(1);
  const audio = useAudio();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [avatar, setAvatar] = useState("");
  const [theme, setTheme] = useState("");

  const [scanStarted, setScanStarted] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [clues, setClues] = useState<string[]>([]);
  const [clueIndex, setClueIndex] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showFoundAnim, setShowFoundAnim] = useState(false);
  const [showFoundPopup, setShowFoundPopup] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [muted, setMutedState] = useState(false);

  const arCanvasRef = useRef<HTMLCanvasElement>(null);

  const {
    isActive,
    isSupported,
    error,
    isLoading,
    startCamera,
    stopCamera,
    videoRef,
    canvasRef,
    retry,
  } = useCamera({ facingMode: "environment" });

  const goTo = useCallback((s: Screen) => setScreen(s), []);

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    audio.setMuted(next);
    if (!next && screen === 5) {
      audio.startBgMusic();
    }
  };

  // Reset scan state when entering screen 4 — do NOT auto-start camera
  useEffect(() => {
    if (screen !== 4) {
      setScanStarted(false);
      return;
    }
    setScanProgress(0);
    setScanComplete(false);
    setScanStarted(false);
  }, [screen]);

  // Callback the user triggers by tapping "Start Scanning"
  const handleStartScan = useCallback(async () => {
    setScanStarted(true);
    const success = await startCamera();
    if (!success) {
      setScanStarted(false);
    }
  }, [startCamera]);

  // Scan progress ticker — only runs after the user has tapped Start Scanning
  useEffect(() => {
    if (screen !== 4 || !scanStarted || scanComplete) return;
    scanIntervalRef.current = setInterval(() => {
      setScanProgress((p) => {
        if (p >= 100) {
          clearInterval(scanIntervalRef.current!);
          setScanComplete(true);
          return 100;
        }
        return p + 1;
      });
    }, 200);
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [screen, scanStarted, scanComplete]);

  // Auto-advance after scan complete — 1500ms for snappier UX
  useEffect(() => {
    if (!scanComplete || screen !== 4) return;
    const t = setTimeout(() => goTo(5), 1500);
    return () => clearTimeout(t);
  }, [scanComplete, screen, goTo]);

  // Load clues when entering screen 5
  // biome-ignore lint/correctness/useExhaustiveDependencies: actor is stable
  useEffect(() => {
    if (screen !== 5 || !theme) return;
    setClueIndex(0);
    setTotalPoints(0);
    // Set fallback clues immediately so gameplay is never blocked on the backend
    setClues(FALLBACK_CLUES[theme] ?? FALLBACK_CLUES.mystery);
    actor
      ?.getClues(theme)
      .then((c) => {
        if (c && c.length > 0) setClues(c);
      })
      .catch(() => {});
  }, [screen, theme]);

  // BG music start/stop with screen 5
  // biome-ignore lint/correctness/useExhaustiveDependencies: audio is stable
  useEffect(() => {
    if (screen === 5) {
      audio.startBgMusic();
    } else {
      audio.stopBgMusic();
    }
  }, [screen]);

  // Play clue reveal sound when clueIndex changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: audio is stable
  useEffect(() => {
    if (screen !== 5) return;
    audio.playClueReveal();
  }, [clueIndex, screen]);

  // Stop camera on screen 6
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (screen === 6) stopCamera();
  }, [screen]);

  const handleSaveProfile = () => {
    goTo(4);
    actor
      ?.saveProfile(name, BigInt(Number(age)), avatar, theme)
      .catch(() => {});
  };

  // Called by useARGameplay when target is found in the real world
  const handleTargetFound = useCallback(() => {
    audio.playFoundIt();
    setShowFoundPopup(true);
    setShowFoundAnim(true);
    const newPoints = totalPoints + 10;
    setTotalPoints(newPoints);
    const nextIndex = clueIndex + 1;
    const prevLevel = Math.floor(clueIndex / CLUES_PER_LEVEL);
    const nextLevel = Math.floor(nextIndex / CLUES_PER_LEVEL);
    setTimeout(() => {
      setShowFoundPopup(false);
      setShowFoundAnim(false);
      if (nextIndex >= clues.length) {
        audio.playGameComplete();
        goTo(6);
        actor?.submitScore(name, BigInt(newPoints)).catch(() => {});
      } else {
        if (nextLevel > prevLevel) {
          audio.playLevelUp();
          setShowLevelUp(true);
          setTimeout(() => setShowLevelUp(false), 1500);
        }
        setClueIndex(nextIndex);
      }
    }, 1500);
  }, [audio, totalPoints, clueIndex, clues.length, goTo, actor, name]);

  // Fallback handler for when orientation is not available (desktop / denied)
  const handleFoundItFallback = useCallback(() => {
    handleTargetFound();
  }, [handleTargetFound]);

  const handlePlayAgain = () => {
    setName("");
    setAge("");
    setAvatar("");
    setTheme("");
    setClues([]);
    setTotalPoints(0);
    setClueIndex(0);
    goTo(1);
  };

  const currentLevel = Math.floor(clueIndex / CLUES_PER_LEVEL) + 1;
  const clueInLevel = clueIndex % CLUES_PER_LEVEL;

  // Camera is visible on screens 4 and 5

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Persistent camera video — never unmounts so the stream stays alive */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ display: screen === 4 ? "block" : "none", zIndex: 0 }}
      />
      {/* Hidden processing canvas — stays mounted */}
      <canvas ref={canvasRef} className="hidden" />

      <AnimatePresence>
        {screen === 1 && (
          <ScreenWrap key="s1">
            <NameAgeScreen
              name={name}
              age={age}
              onNameChange={setName}
              onAgeChange={setAge}
              onNext={() => goTo(2)}
            />
          </ScreenWrap>
        )}
        {screen === 2 && (
          <ScreenWrap key="s2">
            <AvatarScreen
              avatar={avatar}
              onSelect={setAvatar}
              onNext={() => goTo(3)}
            />
          </ScreenWrap>
        )}
        {screen === 3 && (
          <ScreenWrap key="s3">
            <ThemeScreen
              theme={theme}
              onSelect={setTheme}
              onNext={handleSaveProfile}
            />
          </ScreenWrap>
        )}
        {screen === 4 && (
          <ScreenWrap key="s4">
            <ScanningScreen
              progress={scanProgress}
              scanComplete={scanComplete}
              scanStarted={scanStarted}
              onStartScan={handleStartScan}
              isActive={isActive}
              isLoading={isLoading}
              cameraError={error}
              onRetry={retry}
              isSupported={isSupported}
            />
          </ScreenWrap>
        )}
        {screen === 5 && (
          <ScreenWrap key="s5">
            <GameplayScreen
              clues={clues}
              clueIndex={clueIndex}
              totalPoints={totalPoints}
              showFoundAnim={showFoundAnim}
              showFoundPopup={showFoundPopup}
              showLevelUp={showLevelUp}
              muted={muted}
              onToggleMute={toggleMute}
              arCanvasRef={arCanvasRef}
              videoRef={videoRef}
              isActive={isActive}
              currentLevel={currentLevel}
              clueInLevel={clueInLevel}
              theme={theme}
              onFoundIt={handleFoundItFallback}
              onFound={handleTargetFound}
              hintsUsed={hintsUsed}
              showHint={showHint}
              onUseHint={() => {
                if (hintsUsed < 5) {
                  setHintsUsed((h) => h + 1);
                  setShowHint(true);
                }
              }}
            />
          </ScreenWrap>
        )}
        {screen === 6 && (
          <ScreenWrap key="s6">
            <EndScreen
              totalPoints={totalPoints}
              name={name}
              onPlayAgain={handlePlayAgain}
            />
          </ScreenWrap>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Screen 1: Name & Age ─────────────────────────────────────────────────────
function NameAgeScreen({
  name,
  age,
  onNameChange,
  onAgeChange,
  onNext,
}: {
  name: string;
  age: string;
  onNameChange: (v: string) => void;
  onAgeChange: (v: string) => void;
  onNext: () => void;
}) {
  const valid = name.trim().length > 0 && Number(age) >= 1 && Number(age) <= 12;
  return (
    <div className="min-h-screen bg-gradient-to-b from-[oklch(0.97_0.06_85)] to-[oklch(0.92_0.08_85)] flex flex-col items-center justify-center px-6 py-10">
      <div className="absolute top-8 left-8 text-4xl animate-sparkle">⭐</div>
      <div className="absolute top-16 right-10 text-3xl animate-bounce-slow">
        🌟
      </div>
      <div
        className="absolute bottom-20 left-6 text-3xl animate-sparkle"
        style={{ animationDelay: "0.5s" }}
      >
        ✨
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-7xl mb-4 animate-bounce-slow"
      >
        🗺️
      </motion.div>

      <h1 className="font-display text-4xl font-bold text-center text-[oklch(0.25_0.08_45)] mb-2">
        AR Treasure Hunt!
      </h1>
      <p className="text-lg text-[oklch(0.45_0.06_260)] mb-10 text-center">
        Let's start your adventure!
      </p>

      <div className="w-full max-w-sm space-y-5">
        <div>
          <label
            htmlFor="player-name"
            className="block font-display font-bold text-xl text-[oklch(0.3_0.08_45)] mb-2"
          >
            What's your name? 👋
          </label>
          <Input
            id="player-name"
            data-ocid="onboarding.input"
            placeholder="Type your name here..."
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="h-14 text-xl rounded-2xl border-2 border-[oklch(0.75_0.12_45)] focus:border-[oklch(0.68_0.2_45)] bg-white/90 font-body"
          />
        </div>
        <div>
          <label
            htmlFor="player-age"
            className="block font-display font-bold text-xl text-[oklch(0.3_0.08_45)] mb-2"
          >
            How old are you? 🎂
          </label>
          <Input
            id="player-age"
            data-ocid="onboarding.input"
            type="number"
            min={1}
            max={12}
            placeholder="Your age (1-12)"
            value={age}
            onChange={(e) => onAgeChange(e.target.value)}
            className="h-14 text-xl rounded-2xl border-2 border-[oklch(0.75_0.12_45)] focus:border-[oklch(0.68_0.2_45)] bg-white/90 font-body"
          />
        </div>

        <Button
          data-ocid="onboarding.primary_button"
          disabled={!valid}
          onClick={onNext}
          className="w-full h-16 text-2xl font-display font-bold rounded-2xl bg-[oklch(0.68_0.2_45)] hover:bg-[oklch(0.62_0.2_45)] text-white shadow-fun disabled:opacity-40 disabled:shadow-none transition-all active:translate-y-1 active:shadow-none"
        >
          Let's Go! 🚀
        </Button>
      </div>

      <footer className="absolute bottom-4 text-center text-sm text-[oklch(0.6_0.04_260)]">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          className="underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}

// ─── Screen 2: Avatar Picker ──────────────────────────────────────────────────
function AvatarScreen({
  avatar,
  onSelect,
  onNext,
}: { avatar: string; onSelect: (a: string) => void; onNext: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[oklch(0.93_0.08_295)] to-[oklch(0.88_0.1_295)] flex flex-col items-center justify-center px-6 py-10">
      <div className="absolute top-8 right-8 text-4xl animate-sparkle">🌟</div>
      <div className="absolute bottom-24 left-8 text-3xl animate-bounce-slow">
        ✨
      </div>

      <h1 className="font-display text-4xl font-bold text-center text-[oklch(0.25_0.1_295)] mb-2">
        Choose your explorer!
      </h1>
      <p className="text-lg text-[oklch(0.4_0.08_295)] mb-8 text-center">
        Who are you today?
      </p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
        {AVATARS.map((a) => (
          <motion.button
            key={a.id}
            data-ocid={`avatar.${a.id}.button`}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(a.id)}
            className={`flex flex-col items-center justify-center p-5 rounded-3xl border-4 transition-all ${
              avatar === a.id
                ? "border-[oklch(0.58_0.19_295)] bg-white shadow-[0_0_0_4px_oklch(0.78_0.15_295)] scale-105"
                : "border-[oklch(0.8_0.08_295)] bg-white/80 hover:bg-white"
            }`}
          >
            <span className="text-5xl mb-2">{a.emoji}</span>
            <span className="font-display font-bold text-lg text-[oklch(0.3_0.1_295)]">
              {a.label}
            </span>
          </motion.button>
        ))}
      </div>

      <Button
        data-ocid="avatar.primary_button"
        disabled={!avatar}
        onClick={onNext}
        className="w-full max-w-sm h-16 text-2xl font-display font-bold rounded-2xl bg-[oklch(0.58_0.19_295)] hover:bg-[oklch(0.52_0.19_295)] text-white shadow-fun-purple disabled:opacity-40 disabled:shadow-none transition-all active:translate-y-1 active:shadow-none"
      >
        Next! 👉
      </Button>
    </div>
  );
}

// ─── Screen 3: Theme Picker ───────────────────────────────────────────────────
function ThemeScreen({
  theme,
  onSelect,
  onNext,
}: { theme: string; onSelect: (t: string) => void; onNext: () => void }) {
  const themeColors: Record<string, string> = {
    pirates:
      "border-[oklch(0.72_0.18_45)] shadow-[0_0_0_4px_oklch(0.82_0.15_45)]",
    space:
      "border-[oklch(0.58_0.19_295)] shadow-[0_0_0_4px_oklch(0.78_0.12_295)]",
    jungle:
      "border-[oklch(0.62_0.18_155)] shadow-[0_0_0_4px_oklch(0.78_0.12_155)]",
    mystery:
      "border-[oklch(0.55_0.16_250)] shadow-[0_0_0_4px_oklch(0.75_0.12_250)]",
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-[oklch(0.96_0.06_160)] to-[oklch(0.9_0.08_160)] flex flex-col items-center justify-center px-6 py-10">
      <div className="absolute top-10 left-8 text-4xl animate-bounce-slow">
        🌿
      </div>
      <div className="absolute top-8 right-10 text-3xl animate-sparkle">🌟</div>

      <h1 className="font-display text-4xl font-bold text-center text-[oklch(0.25_0.1_155)] mb-2">
        Pick your adventure!
      </h1>
      <p className="text-lg text-[oklch(0.4_0.07_155)] mb-8 text-center">
        Where do you want to explore?
      </p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
        {THEMES.map((t) => (
          <motion.button
            key={t.id}
            data-ocid={`theme.${t.id}.button`}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(t.id)}
            className={`flex flex-col items-center justify-center p-5 rounded-3xl border-4 transition-all bg-white/90 ${
              theme === t.id
                ? `${themeColors[t.id]} scale-105`
                : "border-[oklch(0.85_0.06_155)] hover:bg-white"
            }`}
          >
            <span className="text-5xl mb-2">{t.emoji}</span>
            <span className="font-display font-bold text-lg text-[oklch(0.25_0.08_155)]">
              {t.label}
            </span>
          </motion.button>
        ))}
      </div>

      <Button
        data-ocid="theme.primary_button"
        disabled={!theme}
        onClick={onNext}
        className="w-full max-w-sm h-16 text-2xl font-display font-bold rounded-2xl bg-[oklch(0.62_0.18_155)] hover:bg-[oklch(0.56_0.18_155)] text-white shadow-fun-green disabled:opacity-40 disabled:shadow-none transition-all active:translate-y-1 active:shadow-none"
      >
        Next! 👉
      </Button>
    </div>
  );
}

// ─── Screen 4: Scanning ───────────────────────────────────────────────────────
function ScanningScreen({
  progress,
  scanComplete,
  scanStarted,
  onStartScan,
  isActive,
  isLoading,
  cameraError,
  onRetry,
  isSupported,
}: {
  progress: number;
  scanComplete: boolean;
  scanStarted: boolean;
  onStartScan: () => void;
  isActive: boolean;
  isLoading: boolean;
  cameraError?: CameraError | null;
  onRetry: () => void;
  isSupported: boolean | null;
}) {
  const showLanding =
    !scanStarted && !isLoading && !cameraError && isSupported !== false;

  return (
    <div
      className="relative min-h-screen flex flex-col"
      data-ocid="scanning.section"
    >
      {/* ── Permission denied UI ── */}
      {cameraError?.type === "permission" && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-[oklch(0.12_0.04_260)]">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="bg-white rounded-3xl p-8 text-center mx-6 max-w-sm w-full shadow-2xl"
            data-ocid="scanning.permission_denied"
          >
            <div className="text-6xl mb-4">📵</div>
            <h3 className="font-display font-bold text-2xl text-[oklch(0.25_0.08_45)] mb-2">
              Camera Access Needed
            </h3>
            <p className="font-body text-base text-[oklch(0.35_0.05_260)] mb-5 leading-relaxed">
              Please enable camera access in settings to start the treasure
              hunt.
            </p>
            <div className="bg-[oklch(0.96_0.04_260)] rounded-2xl p-4 mb-6 text-left space-y-2">
              <p className="font-display font-bold text-sm text-[oklch(0.3_0.08_45)]">
                How to enable camera:
              </p>
              <div className="space-y-1.5 text-sm text-[oklch(0.4_0.05_260)] font-body">
                <p>
                  📱 <strong>iPhone:</strong> Settings → Safari → Camera → Allow
                </p>
                <p>
                  🤖 <strong>Android:</strong> Settings → Apps → Browser →
                  Permissions → Camera → Allow
                </p>
                <p>
                  💻 <strong>Desktop:</strong> Click the 🔒 lock icon in the
                  address bar → Camera → Allow
                </p>
              </div>
            </div>
            <Button
              type="button"
              data-ocid="scanning.retry_button"
              onClick={onRetry}
              className="w-full h-14 text-xl font-display font-bold rounded-2xl bg-[oklch(0.68_0.2_45)] hover:bg-[oklch(0.62_0.2_45)] text-white shadow-fun transition-all active:translate-y-1 active:shadow-none"
            >
              Try Again 🔄
            </Button>
          </motion.div>
        </div>
      )}

      {/* ── Generic camera error UI ── */}
      {cameraError && cameraError.type !== "permission" && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div
            className="bg-white/90 rounded-3xl p-8 text-center mx-6"
            data-ocid="scanning.error_state"
          >
            <p className="text-2xl font-display font-bold text-red-600">
              😔 Camera Error
            </p>
            <p className="text-gray-600 mt-2">{cameraError.message}</p>
            <Button
              type="button"
              data-ocid="scanning.secondary_button"
              onClick={onRetry}
              className="mt-4 w-full h-12 text-lg font-display font-bold rounded-2xl bg-[oklch(0.68_0.2_45)] hover:bg-[oklch(0.62_0.2_45)] text-white transition-all active:translate-y-1"
            >
              Try Again 🔄
            </Button>
          </div>
        </div>
      )}

      {/* ── Pre-scan landing UI ── */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-[oklch(0.18_0.06_260)] to-[oklch(0.1_0.04_260)] flex flex-col items-center justify-center px-6 py-10 transition-opacity duration-300 ${
          showLanding ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute top-12 left-8 text-4xl animate-bounce-slow opacity-60">
          🌟
        </div>
        <div className="absolute top-20 right-10 text-3xl animate-sparkle opacity-50">
          ✨
        </div>
        <div
          className="absolute bottom-32 right-8 text-3xl animate-bounce-slow opacity-50"
          style={{ animationDelay: "0.7s" }}
        >
          🔮
        </div>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1,
          }}
          className="text-8xl mb-6"
        >
          🔍
        </motion.div>

        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="font-display text-4xl font-bold text-center text-white mb-3"
        >
          Ready to Scan!
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-lg text-white/70 text-center mb-10 max-w-xs leading-relaxed"
        >
          We'll scan your room to place treasure clues in the perfect spots!
        </motion.p>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.45, type: "spring" }}
          className="w-full max-w-sm"
        >
          <Button
            type="button"
            data-ocid="scanning.primary_button"
            onClick={() => onStartScan()}
            className="w-full h-20 text-2xl font-display font-bold rounded-3xl bg-[oklch(0.68_0.2_45)] hover:bg-[oklch(0.62_0.2_45)] text-white shadow-[0_8px_30px_oklch(0.68_0.2_45_/_0.5)] transition-all active:translate-y-1 active:shadow-none"
          >
            Start Scanning 📷
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-sm text-white/40 text-center"
        >
          Camera permission will be requested
        </motion.p>
      </div>

      {/* ── Active scanning UI (shown once scanStarted) ── */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showLanding ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="absolute inset-0 bg-black/40" />

        {!scanComplete && isActive && (
          <div className="absolute inset-0 scanning-grid" />
        )}

        {!scanComplete && isActive && (
          <div
            className="absolute left-0 right-0 h-1 bg-[oklch(0.7_0.22_160)] scan-line opacity-80"
            style={{ boxShadow: "0 0 12px 4px oklch(0.7 0.22 160 / 0.8)" }}
          />
        )}

        {!isActive && !isLoading && isSupported === false && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-white/90 rounded-3xl p-8 text-center mx-6">
              <p className="text-2xl font-display font-bold text-red-600">
                📵 Camera not supported
              </p>
              <p className="text-gray-600 mt-2">
                Try using a modern browser on your phone.
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center z-20"
            data-ocid="scanning.loading_state"
          >
            <div className="bg-white/90 rounded-3xl p-8 text-center">
              <div className="text-4xl mb-3 animate-spin">⚙️</div>
              <p className="font-display font-bold text-xl">
                Starting camera...
              </p>
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center justify-between min-h-screen px-6 py-10">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-white drop-shadow-lg">
              Scan your house! 🏠
            </h2>
            <p className="text-white/90 text-lg mt-1 drop-shadow">
              Move your phone around slowly
            </p>
          </div>

          <AnimatePresence mode="wait">
            {scanComplete ? (
              <motion.div
                key="complete"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-full max-w-sm"
                data-ocid="scanning.success_state"
              >
                <div className="bg-[oklch(0.7_0.22_160)] rounded-3xl p-6 text-center shadow-xl">
                  <p className="text-6xl mb-3">✅</p>
                  <p className="font-display text-3xl font-bold text-white">
                    Scan Complete!
                  </p>
                  <p className="text-white/90 text-lg mt-1">
                    Your adventure world is ready!
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="progress" className="w-full max-w-sm">
                <div className="bg-white/20 backdrop-blur-md rounded-3xl p-6 border border-white/30">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-display font-bold text-white text-xl">
                      Scanning...
                    </span>
                    <span className="font-display font-bold text-4xl text-[oklch(0.88_0.19_95)]">
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full bg-white/30 rounded-full h-5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[oklch(0.72_0.2_45)] to-[oklch(0.88_0.19_95)]"
                      initial={{ width: "0%" }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  <p className="text-white/80 text-sm mt-3 text-center">
                    Keep moving your camera around the room
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 5: Gameplay ───────────────────────────────────────────────────────
function GameplayScreen({
  clues,
  clueIndex,
  totalPoints,
  showFoundAnim,
  showFoundPopup,
  showLevelUp,
  muted,
  onToggleMute,
  arCanvasRef,
  videoRef,
  isActive,
  currentLevel,
  clueInLevel,
  theme,
  onFoundIt,
  onFound,
  hintsUsed,
  showHint,
  onUseHint,
}: {
  clues: string[];
  clueIndex: number;
  totalPoints: number;
  showFoundAnim: boolean;
  showFoundPopup: boolean;
  showLevelUp: boolean;
  muted: boolean;
  onToggleMute: () => void;
  arCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  currentLevel: number;
  clueInLevel: number;
  theme: string;
  onFoundIt: () => void;
  onFound: () => void;
  hintsUsed: number;
  showHint: boolean;
  onUseHint: () => void;
}) {
  const clueHeading =
    (
      {
        pirates: "🏴\u200d☠️ Pirate Quest:",
        space: "🚀 Space Mission:",
        jungle: "🌿 Jungle Trail:",
        mystery: "🔍 Mystery Clue:",
      } as Record<string, string>
    )[theme] ?? "🔍 Find This!";

  const { orientationGranted } = useARGameplay(
    arCanvasRef,
    clueIndex,
    isActive,
    onFound,
  );

  const currentClue = clues[clueIndex] ?? "Look around carefully...";
  const clueNum = clueIndex + 1;
  const progressPct = (clueInLevel / CLUES_PER_LEVEL) * 100;

  // Determine if AR orientation is working
  const arWorking = orientationGranted === true;
  const arPending = orientationGranted === null;

  return (
    <div
      className="relative min-h-screen flex flex-col"
      data-ocid="gameplay.section"
    >
      {/* Camera feed background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      />

      {/* AR overlay canvas */}
      <canvas
        ref={arCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
        style={{ willChange: "transform" }}
      />

      <div className="absolute inset-0 bg-black/30" style={{ zIndex: 10 }} />

      {/* Orientation pending banner */}
      {arPending && (
        <div className="absolute top-0 left-0 right-0 z-40 flex justify-center pt-2">
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-white/80 text-xs font-body">
              Requesting motion sensors...
            </span>
          </div>
        </div>
      )}

      {/* HUD top bar */}
      <div className="relative z-30 flex items-center gap-2 px-4 pt-10 pb-3">
        {/* Level badge */}
        <div className="bg-[oklch(0.58_0.19_295_/_0.92)] backdrop-blur rounded-xl px-3 py-1.5 flex-shrink-0">
          <span className="font-display font-bold text-white text-sm">
            Lvl {currentLevel}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="w-full bg-white/25 rounded-full h-2.5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[oklch(0.72_0.2_45)] to-[oklch(0.88_0.19_95)]"
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Clue counter */}
        <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-1.5 flex-shrink-0">
          <span className="font-display font-bold text-white text-sm">
            {clueInLevel + 1}/{CLUES_PER_LEVEL}
          </span>
        </div>

        {/* Points */}
        <div className="bg-[oklch(0.88_0.19_95_/_0.92)] rounded-xl px-3 py-1.5 flex-shrink-0">
          <span className="font-display font-bold text-[oklch(0.25_0.08_45)] text-sm">
            ⭐ {totalPoints}
          </span>
        </div>

        {/* Mute toggle */}
        <button
          type="button"
          data-ocid="gameplay.toggle"
          onClick={onToggleMute}
          className="bg-white/20 backdrop-blur rounded-xl px-3 py-1.5 flex-shrink-0 text-white text-lg hover:bg-white/30 active:scale-95 transition-all"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* "You Found It!" popup — shown when AR detects the target */}
      <AnimatePresence>
        {showFoundPopup && (
          <motion.div
            key="found-popup"
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            data-ocid="gameplay.success_state"
          >
            <div className="bg-white/95 backdrop-blur-md rounded-3xl px-10 py-8 text-center shadow-2xl border-4 border-[oklch(0.88_0.19_95)]">
              <div className="text-6xl mb-3">🎉</div>
              <p className="font-display font-bold text-3xl text-[oklch(0.3_0.08_45)]">
                You found it!
              </p>
              <p className="font-display font-bold text-4xl text-[oklch(0.68_0.2_45)] mt-1">
                +10 ⭐
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Found it animation (emoji burst) */}
      <AnimatePresence>
        {showFoundAnim && (
          <motion.div
            key="found"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
          >
            <div className="text-8xl animate-bounce-slow">🎊</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level-up overlay */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            key="levelup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none bg-black/40"
            data-ocid="gameplay.panel"
          >
            <div
              className="text-center"
              style={{ animation: "level-up-flash 1.5s ease-out forwards" }}
            >
              <div className="text-7xl mb-2">🎮</div>
              <div className="font-display font-bold text-5xl text-[oklch(0.88_0.19_95)] drop-shadow-[0_2px_16px_oklch(0.68_0.2_45)]">
                LEVEL UP!
              </div>
              <div className="font-display font-bold text-2xl text-white mt-2">
                Level {currentLevel} 🌟
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clue card */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-5">
        <motion.div
          key={clueIndex}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-xl"
          data-ocid="gameplay.card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[oklch(0.68_0.2_45)] flex items-center justify-center text-white font-display font-bold text-lg">
              {clueNum}
            </div>
            <p className="font-display font-bold text-xl text-[oklch(0.3_0.08_45)]">
              {clueHeading}
            </p>
          </div>
          <p className="font-body text-xl text-[oklch(0.25_0.05_260)] mb-4 leading-relaxed">
            {currentClue}
          </p>

          {/* Hint section */}
          {showHint && (
            <div className="bg-[oklch(0.96_0.08_85)] border border-[oklch(0.85_0.12_55)] rounded-2xl px-4 py-3 mb-4">
              <p className="text-xs font-display font-bold text-[oklch(0.55_0.1_45)] uppercase tracking-wide mb-1">
                💡 Bigger Clue
              </p>
              <p className="font-body text-base text-[oklch(0.3_0.08_45)] leading-relaxed">
                {(FALLBACK_HINTS[theme] ?? FALLBACK_HINTS.mystery)[clueIndex] ??
                  "Look carefully around the room!"}
              </p>
            </div>
          )}

          {/* Hint button */}
          {!showHint && hintsUsed < 5 && (
            <button
              type="button"
              onClick={onUseHint}
              className="w-full mb-3 py-2 rounded-2xl border-2 border-dashed border-[oklch(0.7_0.15_55)] text-[oklch(0.5_0.12_45)] font-display font-bold text-base bg-[oklch(0.97_0.05_85)] hover:bg-[oklch(0.93_0.09_85)] active:translate-y-0.5 transition-all"
            >
              💡 Need a hint? ({5 - hintsUsed} left)
            </button>
          )}
          {!showHint && hintsUsed >= 5 && (
            <div className="w-full mb-3 py-2 rounded-2xl border border-[oklch(0.8_0.05_260)] text-[oklch(0.6_0.05_260)] font-body text-sm text-center bg-white/50">
              No hints left — you can do it! 💪
            </div>
          )}

          {arWorking ? (
            // AR mode: button is disabled, user must physically find the target
            <div className="space-y-2">
              <Button
                data-ocid="gameplay.primary_button"
                disabled
                className="w-full h-14 text-xl font-display font-bold rounded-2xl bg-[oklch(0.75_0.1_260)] text-white/80 cursor-not-allowed opacity-80"
              >
                Point at the treasure! 🔍
              </Button>
              <p className="text-center text-sm text-[oklch(0.45_0.05_260)] font-body">
                Move your camera to find the hidden marker
              </p>
            </div>
          ) : (
            // Fallback mode (desktop / orientation denied): allow manual tap
            <Button
              data-ocid="gameplay.primary_button"
              onClick={onFoundIt}
              className="w-full h-14 text-xl font-display font-bold rounded-2xl bg-[oklch(0.68_0.2_45)] hover:bg-[oklch(0.62_0.2_45)] text-white shadow-fun transition-all active:translate-y-1 active:shadow-none"
            >
              Found It! 🎉
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Screen 6: End Screen ─────────────────────────────────────────────────────
function EndScreen({
  totalPoints,
  name,
  onPlayAgain,
}: { totalPoints: number; name: string; onPlayAgain: () => void }) {
  const confetti = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.floor(Math.random() * 100),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: (i % 10) * 0.15,
  }));

  const getMessage = () => {
    if (totalPoints >= 50) return "Amazing Explorer! 🏆";
    if (totalPoints >= 30) return "Great Job! 🌟";
    if (totalPoints >= 10) return "Nice Try! 🎉";
    return "Keep Exploring! 🗺️";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[oklch(0.92_0.1_85)] to-[oklch(0.85_0.12_55)] flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
      {confetti.map((c) => (
        <ConfettiPiece key={c.id} x={c.x} color={c.color} delay={c.delay} />
      ))}

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        className="text-8xl mb-4 animate-bounce-slow"
        data-ocid="endscreen.section"
      >
        🏆
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="font-display text-4xl font-bold text-center text-[oklch(0.25_0.1_45)] mb-2"
      >
        Adventure Complete!
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xl text-[oklch(0.4_0.08_45)] mb-6 text-center"
      >
        Well done, {name}! 🎊
      </motion.p>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: "spring" }}
        className="bg-white rounded-3xl p-8 text-center shadow-xl mb-6 w-full max-w-sm border-4 border-[oklch(0.88_0.19_95)]"
      >
        <div className="text-7xl font-display font-bold text-[oklch(0.68_0.2_45)]">
          {totalPoints}
        </div>
        <div className="font-display font-bold text-2xl text-[oklch(0.5_0.1_45)]">
          points
        </div>
        <div className="mt-3 font-display font-bold text-xl text-[oklch(0.55_0.19_295)]">
          {getMessage()}
        </div>
        <div className="flex justify-center gap-1 mt-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={
                i < 1 ? "s1" : i < 2 ? "s2" : i < 3 ? "s3" : i < 4 ? "s4" : "s5"
              }
              className={`text-3xl ${i < Math.ceil(totalPoints / 10) ? "" : "opacity-30"}`}
            >
              ⭐
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="w-full max-w-sm"
      >
        <Button
          data-ocid="endscreen.primary_button"
          onClick={onPlayAgain}
          className="w-full h-16 text-2xl font-display font-bold rounded-2xl bg-[oklch(0.68_0.2_45)] hover:bg-[oklch(0.62_0.2_45)] text-white shadow-fun transition-all active:translate-y-1 active:shadow-none"
        >
          Play Again! 🗺️
        </Button>
      </motion.div>

      <footer className="mt-8 text-center text-sm text-[oklch(0.55_0.05_260)]">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          className="underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
