import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { CropArea } from "../api/images";
import Modal from "./Modal";

type Corner = "nw" | "ne" | "sw" | "se";
type Drag = { mode: "move" | Corner; startX: number; startY: number; start: CropArea };

interface Props {
  file: File;
  aspect: number; // 너비 / 높이 (16 / 9)
  initialArea?: CropArea; // 다시 조정할 때 이전 영역
  onApply: (area: CropArea) => Promise<void>;
  onClose: () => void;
}

const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];
// 영역의 최소 너비(원본 픽셀). 너무 작게 고르면 줄인 썸네일이 흐려진다
const MIN_WIDTH_PX = 160;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// 이미지 위의 비율 고정 박스를 움직이고 모서리로 크기를 바꿔 쓸 영역을 고른다
export default function ImageCropModal({ file, aspect, initialArea, onApply, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [area, setArea] = useState<CropArea | null>(initialArea ?? null);
  const [ratio, setRatio] = useState(1); // 영역 높이 = 너비 × ratio (이미지 가로세로 비율로 환산한 값)
  const [minWidth, setMinWidth] = useState(0.1);
  const [applying, setApplying] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  // 미리보기 URL은 이펙트 안에서 만들고 정리한다 (개발 모드에서 이펙트가 두 번 돌아도 쓰는 URL이 지워지지 않게)
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // 이미지 크기를 알고 나서 비율을 정하고, 처음이면 가운데에 가장 큰 영역을 잡는다
  const onLoad = (img: HTMLImageElement) => {
    const r = img.naturalWidth / img.naturalHeight / aspect;
    setRatio(r);
    setMinWidth(Math.min(1, MIN_WIDTH_PX / img.naturalWidth));
    if (!initialArea) {
      const width = r > 1 ? 1 / r : 1;
      const height = width * r;
      setArea({ x: (1 - width) / 2, y: (1 - height) / 2, width, height });
    }
  };

  const start = (mode: Drag["mode"]) => (e: PointerEvent) => {
    if (!area) return;
    e.preventDefault();
    e.stopPropagation();
    stageRef.current?.setPointerCapture(e.pointerId);
    drag.current = { mode, startX: e.clientX, startY: e.clientY, start: area };
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    const stage = stageRef.current;
    if (!d || !stage) return;
    const rect = stage.getBoundingClientRect();
    const dx = (e.clientX - d.startX) / rect.width;
    const dy = (e.clientY - d.startY) / rect.height;
    setArea(d.mode === "move" ? move(d.start, dx, dy) : resize(d.start, d.mode, dx, dy, ratio, minWidth));
  };

  const end = () => {
    drag.current = null;
  };

  // 방향키로 움직이고(Shift는 크게), +/-로 크기를 바꾼다
  const onKeyDown = (e: KeyboardEvent) => {
    if (!area) return;
    const step = e.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      setArea(move(area, ...moves[e.key]));
    } else if (e.key === "+" || e.key === "=" || e.key === "-") {
      e.preventDefault();
      setArea(zoom(area, e.key === "-" ? -0.05 : 0.05, ratio, minWidth));
    }
  };

  const apply = async () => {
    if (!area || applying) return;
    setApplying(true);
    try {
      await onApply(area);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal title="썸네일 영역 고르기" onClose={onClose} wide>
      <p className="panel__desc">박스를 옮기거나 모서리를 끌어 크기를 맞춰 주세요. 목록에는 이 부분만 보여요.</p>
      <div className="crop">
        <div
          ref={stageRef}
          className="crop__stage"
          onPointerMove={onPointerMove}
          onPointerUp={end}
          onPointerCancel={end}
        >
          {url && <img src={url} alt="" draggable={false} onLoad={(e) => onLoad(e.currentTarget)} />}
          {area && (
            <div
              className="crop__box"
              tabIndex={0}
              aria-label="썸네일 영역. 방향키로 옮기고 +, - 키로 크기를 바꿔요"
              style={{
                left: `${area.x * 100}%`,
                top: `${area.y * 100}%`,
                width: `${area.width * 100}%`,
                height: `${area.height * 100}%`,
              }}
              onPointerDown={start("move")}
              onKeyDown={onKeyDown}
            >
              {CORNERS.map((corner) => (
                <span
                  key={corner}
                  className={`crop__handle crop__handle--${corner}`}
                  onPointerDown={start(corner)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="modal__actions">
        <button type="button" onClick={onClose} className="btn btn--outline btn--sm">
          취소
        </button>
        <button type="button" onClick={apply} className="btn btn--primary btn--sm" disabled={!area || applying}>
          {applying ? "적용하고 있어요..." : "적용"}
        </button>
      </div>
    </Modal>
  );
}

function move(start: CropArea, dx: number, dy: number): CropArea {
  return {
    ...start,
    x: clamp(start.x + dx, 0, 1 - start.width),
    y: clamp(start.y + dy, 0, 1 - start.height),
  };
}

// 반대쪽 모서리를 고정하고 끄는 모서리 쪽으로 크기를 바꾼다. 비율은 그대로 두고 이미지 밖으로 나가지 않게 한다
function resize(start: CropArea, corner: Corner, dx: number, dy: number, ratio: number, minWidth: number): CropArea {
  const west = corner.includes("w");
  const north = corner.includes("n");
  const anchorX = west ? start.x + start.width : start.x;
  const anchorY = north ? start.y + start.height : start.y;
  const cornerX = (west ? start.x : start.x + start.width) + dx;
  const cornerY = (north ? start.y : start.y + start.height) + dy;

  const maxWidth = Math.min(west ? anchorX : 1 - anchorX, (north ? anchorY : 1 - anchorY) / ratio);
  const width = clamp(
    Math.max(Math.abs(cornerX - anchorX), Math.abs(cornerY - anchorY) / ratio),
    Math.min(minWidth, maxWidth),
    maxWidth,
  );
  const height = width * ratio;
  return { x: west ? anchorX - width : anchorX, y: north ? anchorY - height : anchorY, width, height };
}

// 가운데를 기준으로 크기를 바꾼다
function zoom(start: CropArea, delta: number, ratio: number, minWidth: number): CropArea {
  const maxWidth = Math.min(1, 1 / ratio);
  const width = clamp(start.width + delta, Math.min(minWidth, maxWidth), maxWidth);
  const height = width * ratio;
  const cx = start.x + start.width / 2;
  const cy = start.y + start.height / 2;
  return {
    x: clamp(cx - width / 2, 0, 1 - width),
    y: clamp(cy - height / 2, 0, 1 - height),
    width,
    height,
  };
}
