import { useEffect, useRef, useState } from 'react';
import { GameEngine3D, type GameState } from './game/engine3d';
import { cn } from './utils/cn';

const TOOLS = [
  { id: 'hand' as const, icon: '🖐️', key: '1', desc: 'Chop trees · C' },
  { id: 'hoe' as const, icon: '⛏️', key: '2', desc: 'Farm · F / G' },
  { id: 'build' as const, icon: '🏗️', key: '3', desc: 'Place · Space' },
  { id: 'fish' as const, icon: '🎣', key: '4', desc: 'Fish · R' },
];

const BUILD_TYPES = [
  { id: 'floor' as const, icon: '▬', key: '5' },
  { id: 'wall' as const, icon: '▮', key: '6' },
  { id: 'roof' as const, icon: '▲', key: '7' },
];

const TIME_ICON: Record<string, string> = { Dawn: '🌅', Day: '☀️', Dusk: '🌇', Night: '🌙' };

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine3D | null>(null);
  const [state, setState] = useState<GameState>({
    wood: 0, crops: 0, fish: 0, coins: 30,
    tool: 'hand', buildType: 'floor',
    prompt: '', toast: '', toastTimer: 0,
    inVehicle: false, dayTime: 8, dayLabel: 'Day', timeString: '08:00',
    speed: 0, fishingActive: false, fishingBite: false,
    fishingTimer: 0, fishingWindow: 0, tradeOpen: false,
  });
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new GameEngine3D(containerRef.current);
    engineRef.current = engine;
    engine.start();

    const interval = setInterval(() => {
      setState(engine.getState());
    }, 80);

    return () => {
      engine.destroy();
      clearInterval(interval);
    };
  }, []);

  const setTool = (tool: 'hand' | 'hoe' | 'build' | 'fish') => {
    engineRef.current?.setTool(tool);
    setState((s) => ({ ...s, tool }));
  };

  const setBuildType = (type: 'floor' | 'wall' | 'roof') => {
    engineRef.current?.setBuildType(type);
    setState((s) => ({ ...s, buildType: type }));
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Cinematic vignette — pure CSS, no shader cost */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)',
        }}
      />

      {/* ===== UI OVERLAY ===== */}
      <div className="pointer-events-none absolute inset-0 font-sans text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.85)]">
        {/* Top Left: title + time, no boxes — pure typography */}
        <div className="absolute left-6 top-5 flex items-center gap-4">
          <div>
            <h1 className="text-[13px] font-semibold tracking-[0.2em] text-white/90 uppercase">Jungle Horizon</h1>
            <p className="text-[10px] tracking-[0.15em] text-emerald-300/70 uppercase">Life &amp; Trade</p>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="text-lg opacity-90">{TIME_ICON[state.dayLabel] ?? '☀️'}</span>
            <span className="text-lg font-light tabular-nums tracking-wide">{state.timeString}</span>
          </div>
        </div>

        {/* Top Right: inventory as a slim glass strip */}
        <div className="pointer-events-auto absolute right-6 top-5 flex items-center gap-4 rounded-full bg-black/25 px-5 py-2 backdrop-blur-md">
          <Stat icon="🪵" value={state.wood} />
          <Stat icon="🌾" value={state.crops} />
          <Stat icon="🐟" value={state.fish} />
          <div className="h-5 w-px bg-white/20" />
          <Stat icon="🪙" value={state.coins} accent="text-yellow-300" />
          <button
            onClick={() => setShowHelp((v) => !v)}
            className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold hover:bg-white/20"
          >
            ?
          </button>
        </div>

        {/* Controls legend — minimal, fades in/out */}
        {showHelp && (
          <div className="pointer-events-none absolute right-6 top-16 w-56 rounded-2xl bg-black/25 p-4 text-[11px] leading-relaxed text-white/75 backdrop-blur-md">
            <p><span className="text-white/95">WASD</span> Move&nbsp;&nbsp;<span className="text-white/95">Mouse</span> Look</p>
            <p><span className="text-white/95">Space</span> Jump / Place&nbsp;&nbsp;<span className="text-white/95">E</span> Vehicle</p>
            <p><span className="text-white/95">C</span> Chop&nbsp;&nbsp;<span className="text-white/95">F/G/H</span> Till/Plant/Harvest</p>
            <p><span className="text-white/95">R</span> Fish&nbsp;&nbsp;<span className="text-white/95">T</span> Trade&nbsp;&nbsp;<span className="text-white/95">1-4</span> Tools</p>
          </div>
        )}

        {/* Speed (when driving) */}
        {state.inVehicle && (
          <div className="pointer-events-none absolute right-6 bottom-40 text-right">
            <p className="text-[10px] tracking-[0.2em] text-emerald-300/70 uppercase">Speed</p>
            <p className="text-4xl font-thin tabular-nums">{state.speed}<span className="ml-1 text-sm font-light text-white/60">km/h</span></p>
          </div>
        )}

        {/* Fishing indicator */}
        {state.fishingActive && (
          <div className="absolute left-1/2 top-24 -translate-x-1/2">
            <div className={cn(
              'rounded-full px-6 py-2.5 text-lg font-medium backdrop-blur-md transition-colors',
              state.fishingBite ? 'bg-red-500/70 animate-pulse' : 'bg-black/25'
            )}>
              {state.fishingBite ? '🐟 Click to reel in!' : '🎣 Waiting for a bite…'}
            </div>
          </div>
        )}

        {/* Toast notification */}
        {state.toast && (
          <div className="absolute left-1/2 top-[6.5rem] -translate-x-1/2 animate-[fadeSlideIn_0.25s_ease-out]">
            <p className="text-sm font-medium tracking-wide text-white/95">{state.toast}</p>
          </div>
        )}

        {/* Action prompt — plain cinematic subtitle, no box */}
        {state.prompt && !state.tradeOpen && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
            <p className="text-base font-light tracking-wide text-white/95">{state.prompt}</p>
          </div>
        )}

        {/* Tool Wheel */}
        <div className="pointer-events-auto absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
          {state.tool === 'build' && (
            <div className="flex gap-1.5 rounded-full bg-black/25 p-1.5 backdrop-blur-md">
              {BUILD_TYPES.map((bt) => (
                <button
                  key={bt.id}
                  onClick={() => setBuildType(bt.id)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all',
                    state.buildType === bt.id ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
                  )}
                >
                  {bt.icon}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1.5 rounded-full bg-black/25 p-1.5 backdrop-blur-md">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setTool(tool.id)}
                title={tool.desc}
                className={cn(
                  'relative flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all',
                  state.tool === tool.id
                    ? 'bg-emerald-500/90 scale-110 shadow-lg shadow-emerald-500/30'
                    : 'bg-white/10 hover:bg-white/20'
                )}
              >
                {tool.icon}
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black/60 text-[8px] font-bold">
                  {tool.key}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Trade Modal */}
        {state.tradeOpen && (
          <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-96 rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-wide">⚓ Kena-Becha Trading</h2>
                <button onClick={() => engineRef.current?.closeTrade()} className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">
                  ✕
                </button>
              </div>
              <p className="mb-4 text-sm text-white/60">Sell your goods or buy upgrades at this trading post.</p>
              <div className="mb-4 space-y-2 rounded-2xl bg-white/5 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>🪵 Wood</span>
                  <span className="text-amber-300">{state.wood} × 2 = {state.wood * 2}g</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🌾 Crops</span>
                  <span className="text-lime-300">{state.crops} × 8 = {state.crops * 8}g</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🐟 Fish</span>
                  <span className="text-cyan-300">{state.fish} × 12 = {state.fish * 12}g</span>
                </div>
                <div className="border-t border-white/10 pt-2 text-right font-semibold text-yellow-300">
                  Total: {state.wood * 2 + state.crops * 8 + state.fish * 12}g
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => engineRef.current?.sellAll()}
                  className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
                >
                  Sell All
                </button>
                <button
                  onClick={() => engineRef.current?.buySeeds()}
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-400"
                >
                  Buy Seeds (10g)
                </button>
              </div>
              <button
                onClick={() => engineRef.current?.buyUpgrade()}
                className="mt-2 w-full rounded-xl bg-purple-500/80 py-2.5 text-sm font-semibold text-white hover:bg-purple-400"
              >
                Buy Upgrade (50g)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, value, accent }: { icon: string; value: number; accent?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm">
      <span>{icon}</span>
      <span className={cn('font-medium tabular-nums', accent ?? 'text-white/90')}>{value}</span>
    </span>
  );
}
