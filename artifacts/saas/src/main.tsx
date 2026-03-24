import { createRoot } from "react-dom/client";
import { handleAuthCallback } from "./lib/auth-callback";
import App from "./App";
import "./index.css";

handleAuthCallback().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
