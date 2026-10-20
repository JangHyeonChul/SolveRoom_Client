import { createBrowserRouter } from "react-router-dom";
import Layout from "../components/Layout";
import HomePage from "../pages/HomePage";
import CardDetailPage from "../pages/CardDetailPage";
import CardFormPage from "../pages/CardFormPage";
import QuestionFormPage from "../pages/QuestionFormPage";
import QuestionManagePage from "../pages/QuestionManagePage";
import PlayPage from "../pages/PlayPage";
import ResultPage from "../pages/ResultPage";
import MultiLobbyPage from "../pages/MultiLobbyPage";
import MultiRoomPage from "../pages/MultiRoomPage";
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
      { path: "/cards/:cardId/play", element: <PlayPage /> }, // Q-03
      { path: "/cards/:cardId/result", element: <ResultPage /> }, // Q-05
      { path: "/cards/:cardId/edit", element: <CardFormPage /> }, // M-01
      { path: "/cards/:cardId/questions", element: <QuestionManagePage /> }, // M-02
      { path: "/cards/:cardId/questions/new", element: <QuestionFormPage /> }, // M-03
      { path: "/cards/:cardId/questions/:questionId/edit", element: <QuestionFormPage /> }, // M-03
      { path: "/multi", element: <MultiLobbyPage /> }, // MP-01
      { path: "/multi/rooms/:roomNo", element: <MultiRoomPage /> }, // MP-02
      { path: "/login", element: <PlaceholderPage screenId="A-01" title="로그인" /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
