import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router";
import App from "./App.tsx";
import "./index.css";

const router = createHashRouter([{ path: "/", Component: App }]);

// biome-ignore lint/style/noNonNullAssertion: root is guaranteed see: ../index.html
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
