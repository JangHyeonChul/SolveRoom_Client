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

// GIF는 줄이면 첫 장면만 남아 움직임이 사라지므로 1차에서는 받지 않는다
export const UPLOADABLE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const UPLOADABLE_ACCEPT = UPLOADABLE_TYPES.join(", ");

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

// 자르지 않고 줄이기만 해서 올린다 (문제 이미지)
export async function uploadImage(file: File, purpose: ImagePurpose): Promise<string> {
  return uploadPrepared(await prepareImage(file, purpose), purpose);
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
