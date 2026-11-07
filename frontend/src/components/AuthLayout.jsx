import "../styles/signup.css";

export default function AuthLayout({ children }) {
  return (
    <div className="ph-auth">
      <aside className="ph-auth__brand">
        <div className="ph-auth__logo">
          <span className="ph-auth__logo-mark" />
          ProofHire
        </div>

        <div>
          <h1 className="ph-auth__headline">
            Prove your skills, not your prompts.
          </h1>
          <p className="ph-auth__sub">
            Apply with your CV, then talk through your own work with an AI
            interviewer. Recruiters see who really understands it.
          </p>
        </div>

        <p className="ph-auth__footnote">Proof of skills in the AI era</p>
      </aside>

      <main className="ph-auth__main">{children}</main>
    </div>
  );
}
