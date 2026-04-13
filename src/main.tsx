import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// OnchainKit styles load from /public/vendor at runtime to avoid PostCSS conflicts.

createRoot(document.getElementById("root")!).render(<App />);
