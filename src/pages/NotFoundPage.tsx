import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <p className="text-slate-500">페이지를 찾을 수 없습니다.</p>
      <Link to="/" className="mt-4 inline-block text-indigo-600 hover:underline">
        홈으로
      </Link>
    </div>
  );
}
