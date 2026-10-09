import { Link } from "react-router-dom";

export default function NotFoundPage({ message = "페이지를 찾을 수 없어요." }: { message?: string }) {
  return (
    <main className="wrap page">
      <div className="empty reveal">
        <span className="empty__title">{message}</span>
        <Link to="/" className="btn btn--outline btn--sm">
          홈으로
        </Link>
      </div>
    </main>
  );
}
