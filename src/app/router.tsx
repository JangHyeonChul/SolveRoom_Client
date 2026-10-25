import { createBrowserRouter } from "react-router-dom";
import SceneRoot from "../components/SceneRoot";
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
import LoginPage from "../pages/LoginPage";
import LoginCallbackPage from "../pages/LoginCallbackPage";
import SignupPage from "../pages/SignupPage";
import NotFoundPage from "../pages/NotFoundPage";

// 주석의 ID는 화면 기획의 화면 목록 ID
export const router = createBrowserRouter([
  {
    element: <SceneRoot />,
    children: [
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
          { path: "/login", element: <LoginPage /> }, // A-01
          { path: "/login/callback", element: <LoginCallbackPage /> }, // A-01 소셜 로그인에서 돌아오는 화면
          { path: "/signup", element: <SignupPage /> }, // A-02
          { path: "*", element: <NotFoundPage /> },
        ],
      },
      // 멀티플레이는 사이드바 없이 화면 전체를 쓴다
      { path: "/multi", element: <MultiLobbyPage /> }, // MP-01
      { path: "/multi/rooms/:roomNo", element: <MultiRoomPage /> }, // MP-02
    ],
  },
]);
