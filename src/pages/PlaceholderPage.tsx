import { Link, useLocation } from "react-router-dom";

interface Props {
  screenId: string;
  title: string;
}

// 아직 만들지 않은 화면. 이전 화면에서 넘어온 state를 확인할 수 있게 보여준다.
export default function PlaceholderPage({ screenId, title }: Props) {
  const { state } = useLocation();

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-sm font-mono text-slate-400">{screenId}</p>
      <h1 className="mt-1 text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-slate-500">준비 중인 화면입니다.</p>
      {state && (
        <pre className="mt-6 overflow-x-auto rounded-lg bg-slate-100 p-4 text-left text-xs">
          {JSON.stringify(state, null, 2)}
        </pre>
      )}
      <Link to="/" className="mt-6 inline-block text-indigo-600 hover:underline">
        홈으로
      </Link>
    </div>
  );
}
