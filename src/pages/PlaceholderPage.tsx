import { Link, useLocation } from "react-router-dom";

interface Props {
  screenId: string;
  title: string;
}

// 아직 만들지 않은 화면. 이전 화면에서 넘어온 state를 확인할 수 있게 보여준다.
export default function PlaceholderPage({ screenId, title }: Props) {
  const { state } = useLocation();

  return (
    <main className="wrap page page--narrow">
      <div className="empty reveal">
        <span className="badge badge--gray">{screenId}</span>
        <span className="empty__title">{title}</span>
        <span>준비 중인 화면이에요.</span>
        {state && (
          <pre className="w-full overflow-x-auto rounded-xl bg-[var(--bg-soft)] p-4 text-left text-xs">
            {JSON.stringify(state, null, 2)}
          </pre>
        )}
        <Link to="/" className="btn btn--outline btn--sm">
          홈으로
        </Link>
      </div>
    </main>
  );
}
