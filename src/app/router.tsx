import { createBrowserRouter } from "react-router-dom";
import Layout from "../components/Layout";
import HomePage from "../pages/HomePage";
import CardDetailPage from "../pages/CardDetailPage";
import CardFormPage from "../pages/CardFormPage";
import QuestionFormPage from "../pages/QuestionFormPage";
import QuestionManagePage from "../pages/QuestionManagePage";
import PlaceholderPage from "../pages/PlaceholderPage";
import NotFoundPage from "../pages/NotFoundPage";

// 주석의 ID는 화면 기획의 화면 목록 ID
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <HomePage /> }, // H-01
      { path: "/cards/new", element: <CardFormPage /> }, // M-01
      { path: "/cards/:cardId", element: <CardDetailPage /> }, // Q-01
      { path: "/cards/:cardId/play", element: <PlaceholderPage screenId="Q-03" title="문제 풀이" /> },
      { path: "/cards/:cardId/result", element: <PlaceholderPage screenId="Q-05" title="결과·랭킹" /> },
      { path: "/cards/:cardId/edit", element: <CardFormPage /> }, // M-01
      { path: "/cards/:cardId/questions", element: <QuestionManagePage /> }, // M-02
      { path: "/cards/:cardId/questions/new", element: <QuestionFormPage /> }, // M-03
      { path: "/cards/:cardId/questions/:questionId/edit", element: <QuestionFormPage /> }, // M-03
      { path: "/login", element: <PlaceholderPage screenId="A-01" title="로그인" /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
