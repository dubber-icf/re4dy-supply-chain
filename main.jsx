// ① Radix design-token sheet  ── must be first
import "@radix-ui/themes/styles.css";
// ② Your Tailwind bundle
import "./index.css";

// ③ Regular React imports
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

 createRoot(document.getElementById("root")).render(
   <StrictMode>
     <App />
   </StrictMode>,
 );