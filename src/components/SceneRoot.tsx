import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Outlet, ScrollRestoration, useNavigate } from "react-router-dom";

type Phase = "idle" | "out" | "loading";

const FADE_MS = 300;
const LOADING_MS = 700;

const SceneNavigateContext = createContext<(to: string) => void>(() => {});

// 화면 전체를 바꾸며 이동한다 (멀티플레이 들어가기·나가기)
export const useSceneNavigate = () => useContext(SceneNavigateContext);

// 모든 화면의 뿌리. 장면 전환은 페이드 아웃 → 로딩 → 이동 → 페이드 인 순서로 한다
export default function SceneRoot() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const busy = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const go = useCallback(
    (to: string) => {
      if (busy.current) return;
      busy.current = true;
      setPhase("out");
      timers.current = [
        window.setTimeout(() => setPhase("loading"), FADE_MS),
        window.setTimeout(() => {
          navigate(to);
          setPhase("idle");
          busy.current = false;
        }, FADE_MS + LOADING_MS),
      ];
    },
    [navigate],
  );

  return (
    <SceneNavigateContext.Provider value={go}>
      <div className={`scene is-${phase}`} aria-busy={phase !== "idle"}>
        <Outlet />
      </div>
      {phase === "loading" && (
        <div className="scene-loader" role="status">
          <span className="spinner" aria-hidden="true" />
          <span className="sr-only">불러오는 중</span>
        </div>
      )}
      <ScrollRestoration />
    </SceneNavigateContext.Provider>
  );
}
