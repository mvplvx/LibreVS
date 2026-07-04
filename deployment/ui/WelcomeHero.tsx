export function WelcomeHero() {
  return (
    <header className="hero">
      <p className="hero-kicker">LibreVS Deployment Manager</p>
      <h1>Self-hosted VSME reporting platform</h1>
      <p>
        LibreVS is a self-hosted VSME reporting platform. Your organization
        decides where LibreVS runs and retains full ownership of its data.
      </p>
      <div className="principles" aria-label="Core principles">
        <span className="principle">Digital sovereignty</span>
        <span className="principle">Open source</span>
        <span className="principle">Self-hosted</span>
        <span className="principle">Privacy-first</span>
        <span className="principle">No cloud dependency</span>
      </div>
    </header>
  );
}
