import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// OnchainKit styles loaded dynamically in BaseProvider to avoid PostCSS conflicts

createRoot(document.getElementById("root")!).render(<App />);
