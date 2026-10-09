import { createBrowserRouter } from "react-router-dom";
import Layout from "../components/Layout";
import HomePage from "../pages/HomePage";
import CardDetailPage from "../pages/CardDetailPage";
import PlaceholderPage from "../pages/PlaceholderPage";
import NotFoundPage from "../pages/NotFoundPage";

// 주석의 ID는 화면 기획의 화면 목록 ID
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <HomePage /> }, // H-01
      { path: "/cards/new", element: <PlaceholderPage screenId="M-01" title="카드 생성" /> },
      { path: "/cards/:cardId", element: <CardDetailPage /> }, // Q-01
      { path: "/cards/:cardId/play", element: <PlaceholderPage screenId="Q-03" title="문제 풀이" /> },
      { path: "/cards/:cardId/result", element: <PlaceholderPage screenId="Q-05" title="결과·랭킹" /> },
      { path: "/cards/:cardId/edit", element: <PlaceholderPage screenId="M-01" title="카드 수정" /> },
      { path: "/cards/:cardId/questions", element: <PlaceholderPage screenId="M-02" title="문제 목록" /> },
      { path: "/cards/:cardId/questions/new", element: <PlaceholderPage screenId="M-03" title="문제 등록" /> },
      { path: "/login", element: <PlaceholderPage screenId="A-01" title="로그인" /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
