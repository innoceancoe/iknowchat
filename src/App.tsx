import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/react";
import "./index.css";

export function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="border-b border-border flex items-center justify-between px-6 py-3 shrink-0">
        <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <span className="text-primary">Inno</span>
          <span>Chat</span>
        </div>

        <nav className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <button
                id="sign-in-btn"
                className="px-4 py-1.5 rounded-md border border-border text-sm hover:bg-accent transition-colors"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                id="sign-up-btn"
                className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
              >
                Sign up
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-4">
          <SignedOut>
            <h1 className="text-3xl font-bold">Welcome to InnoChat</h1>
            <p className="text-muted-foreground text-sm">
              Sign in or create an account to start chatting with AI.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <SignInButton mode="modal">
                <button
                  id="sign-in-hero-btn"
                  className="px-6 py-2 rounded-md border border-border text-sm hover:bg-accent transition-colors"
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  id="sign-up-hero-btn"
                  className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
                >
                  Get started free
                </button>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <h1 className="text-3xl font-bold">You're in! 🎉</h1>
            <p className="text-muted-foreground text-sm">
              Chat UI coming soon. The API is already live at{" "}
              <code className="bg-muted px-1 rounded text-xs">/api/v1</code>.
            </p>
          </SignedIn>
        </div>
      </main>
    </div>
  );
}

export default App;

