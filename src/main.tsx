import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MotionConfig } from "framer-motion"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import "@fontsource/inter/200.css"
import "@fontsource/inter/300.css"
import "@fontsource/inter/400.css"
import "@fontsource/inter/400-italic.css"
import "@fontsource/inter/500.css"
import "@fontsource/inter/600.css"
import App from "./App.tsx"
import { Background } from "./components/ui/Background.tsx"
import "./styles/index.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

const root = document.getElementById("root")
if (!root) throw new Error("Root element missing")

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <div className="relative min-h-screen overflow-x-clip bg-ground">
            <Background />
            <div className="relative">
              <App />
            </div>
          </div>
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
)
