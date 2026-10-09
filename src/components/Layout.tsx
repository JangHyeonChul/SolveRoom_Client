import { Outlet, ScrollRestoration } from "react-router-dom";
import Header from "./Header";

export default function Layout() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <ScrollRestoration />
    </>
  );
}
