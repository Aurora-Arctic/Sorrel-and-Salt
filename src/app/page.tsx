import ThemeToggle from '../components/ThemeToggle';

export default function HomePage() {
  // Temporary: rendered here for visual review while M0.29 is in progress.
  // There's no header/nav to host it in yet — a real placement lands with
  // whichever task adds one.
  return (
    <main>
      <ThemeToggle />
      <h1>Sorrel &amp; Salt</h1>
      <p>A compendium, ingredient store and grimoire.</p>
    </main>
  );
}
