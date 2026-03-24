import { createRoot } from "react-dom/client";
import { handleAuthCallback, handleNativeDeepLink } from "./lib/auth-callback";
import { isNative } from "./lib/capacitor";
import App from "./App";
import "./index.css";

async function initApp() {
  await handleAuthCallback();

  if (isNative) {
    const { App: CapApp } = await import("@capacitor/app");
    CapApp.addListener("appUrlOpen", async (event) => {
      if (event.url.includes("access_token=")) {
        await handleNativeDeepLink(event.url);
      } else {
        const url = new URL(event.url);
        if (url.hash) {
          window.location.hash = url.hash;
        } else if (url.pathname) {
          window.location.hash = `#${url.pathname}`;
        }
      }
    });

    const { StatusBar, Style } = await import("@capacitor/status-bar");
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: "#0d1117" }).catch(() => {});
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

initApp();
