import { request } from "./request";

// 서버 ImagePurpose. 용도별로 줄이는 크기와 서버 상한(썸네일 1MB, 문제 2MB)이 다르다
export type ImagePurpose = "THUMBNAIL" | "QUESTION";

// 이미지에서 쓸 영역. 원본 너비·높이에 대한 비율(0~1)이라 화면에 보이는 크기와 상관없이 같은 곳을 가리킨다
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 업로드 전에 긴 변을 이 크기로 줄인다. 이미 작은 이미지는 키우지 않는다
const MAX_SIDE: Record<ImagePurpose, number> = { THUMBNAIL: 800, QUESTION: 1280 };
const QUALITY = 0.85;

// 썸네일은 자르기와 공유 이미지를 거치므로 GIF를 받지 않는다
export const UPLOADABLE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const UPLOADABLE_ACCEPT = UPLOADABLE_TYPES.join(", ");

// 문제 이미지는 GIF도 받는다. GIF는 줄이면 첫 장면만 남으므로 원본 그대로 올린다
export const QUESTION_IMAGE_TYPES = [...UPLOADABLE_TYPES, "image/gif"];
export const QUESTION_IMAGE_ACCEPT = QUESTION_IMAGE_TYPES.join(", ");

// 서버 ImagePurpose·ImageUploadService와 같은 값. 서버가 등록할 때 다시 확인한다
const GIF_MAX_BYTES = 5 * 1024 * 1024;
const GIF_MAX_DURATION_MS = 10_000;

// 서버 PresignedUrlResponse
interface PresignedUrl {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: string;
}

// 고른 영역(없으면 전체)을 잘라 긴 변을 줄이고 WebP로 만든다. WebP로 못 만드는 브라우저(Safari 등)는 JPEG로 만든다
export async function prepareImage(source: Blob, purpose: ImagePurpose, area?: CropArea): Promise<Blob> {
  // 휴대폰 사진은 EXIF의 회전 정보를 반영해야 눕지 않는다
  const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  try {
    const sx = Math.round((area?.x ?? 0) * bitmap.width);
    const sy = Math.round((area?.y ?? 0) * bitmap.height);
    const sw = Math.max(1, Math.round((area?.width ?? 1) * bitmap.width));
    const sh = Math.max(1, Math.round((area?.height ?? 1) * bitmap.height));
    const scale = Math.min(1, MAX_SIDE[purpose] / Math.max(sw, sh));
    const target = { width: Math.max(1, Math.round(sw * scale)), height: Math.max(1, Math.round(sh * scale)) };
    const draw = (ctx: CanvasRenderingContext2D) => ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, target.width, target.height);

    const webp = await encode(target, draw, "image/webp");
    if (webp.type === "image/webp") return webp;
    // JPEG는 투명을 담지 못해 그대로 두면 검게 나오므로 흰 배경을 깐다
    return await encode(target, draw, "image/jpeg", "#fff");
  } finally {
    bitmap.close();
  }
}

// 준비한 이미지를 S3에 바로 올리고, 카드·문제를 저장할 때 보낼 key를 돌려준다.
// 파일은 서버를 거치지 않는다. 서버는 업로드 URL에 서명만 하고, 저장할 때 올라온 파일을 확인한다
export async function uploadPrepared(blob: Blob, purpose: ImagePurpose): Promise<string> {
  const presigned = await request<PresignedUrl>("/api/main/images/presigned-url", "업로드 URL 발급", {
    method: "POST",
    body: { purpose, contentType: blob.type, size: blob.size },
  });

  // 형식·캐시·pending 표시 헤더가 서명에 들어 있어, 받은 그대로 붙여야 S3가 받는다
  const res = await fetch(presigned.uploadUrl, { method: "PUT", headers: presigned.headers, body: blob });
  if (!res.ok) throw new Error(`이미지 업로드 실패 (${res.status})`);
  return presigned.key;
}

// 자르지 않고 줄이기만 해서 올린다 (문제 이미지). GIF는 줄이지 않고 그대로 올린다
export async function uploadImage(file: File, purpose: ImagePurpose): Promise<string> {
  if (file.type === "image/gif") return uploadPrepared(file, purpose);
  return uploadPrepared(await prepareImage(file, purpose), purpose);
}

// 올릴 수 없는 GIF면 이유를, 올릴 수 있으면 null을 돌려준다
export async function checkGif(file: File): Promise<string | null> {
  if (file.size > GIF_MAX_BYTES) return `GIF는 ${GIF_MAX_BYTES / 1024 / 1024}MB 이하만 올릴 수 있어요`;
  let duration: number;
  try {
    duration = gifDurationMs(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return "GIF 파일을 읽을 수 없어요";
  }
  if (duration > GIF_MAX_DURATION_MS) return `GIF는 ${GIF_MAX_DURATION_MS / 1000}초 이하만 올릴 수 있어요`;
  return null;
}

// GIF를 한 번 재생하는 데 걸리는 시간. 서버 GifInspector와 같은 방식으로, 블록 헤더만 따라가며
// 프레임마다 앞의 Graphic Control Extension에 적힌 표시 시간(1/100초)을 더한다
function gifDurationMs(data: Uint8Array): number {
  let pos = 0;
  const at = (index: number) => {
    if (index >= data.length) throw new Error("GIF가 중간에 잘렸어요");
    return data[index];
  };
  const skipColorTable = (flags: number) => {
    if (flags & 0x80) pos += 3 * (1 << ((flags & 0x07) + 1));
  };
  // 크기 바이트 + 데이터가 이어지다 크기 0에서 끝난다
  const skipSubBlocks = () => {
    let size;
    while ((size = at(pos++)) !== 0) pos += size;
  };

  const signature = String.fromCharCode(...data.subarray(0, 6));
  if (signature !== "GIF87a" && signature !== "GIF89a") throw new Error("GIF가 아니에요");
  // 논리 화면 설명자 7바이트. 다섯 번째 바이트에 전역 색상표 유무와 크기가 있다
  const screenFlags = at(10);
  pos = 13;
  skipColorTable(screenFlags);

  let totalCs = 0;
  let frames = 0;
  let delayCs = 0;
  // 끝 표시(0x3B) 없이 끝나는 파일도 브라우저는 재생하므로 블록 경계에서 끝나면 받아 준다
  while (pos < data.length) {
    const block = at(pos++);
    if (block === 0x3b) break;
    if (block === 0x21) {
      const label = at(pos++);
      if (label === 0xf9 && at(pos) >= 4) delayCs = at(pos + 2) | (at(pos + 3) << 8);
      skipSubBlocks();
    } else if (block === 0x2c) {
      // 이미지 설명자 9바이트 뒤에 지역 색상표, LZW 최소 코드 크기, 데이터 하위 블록이 온다
      const imageFlags = at(pos + 8);
      pos += 9;
      skipColorTable(imageFlags);
      pos++;
      skipSubBlocks();
      // 브라우저는 10ms 이하인 프레임을 100ms로 재생한다
      totalCs += delayCs < 2 ? 10 : delayCs;
      frames++;
      delayCs = 0;
    } else {
      throw new Error("알 수 없는 GIF 블록이에요");
    }
  }
  if (frames === 0) throw new Error("GIF에 프레임이 없어요");
  return totalCs * 10;
}

function encode(
  size: { width: number; height: number },
  draw: (ctx: CanvasRenderingContext2D) => void,
  type: string,
  background?: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("이미지를 변환할 수 없어요"));
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size.width, size.height);
  }
  draw(ctx);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("이미지를 변환할 수 없어요"))), type, QUALITY),
  );
}
