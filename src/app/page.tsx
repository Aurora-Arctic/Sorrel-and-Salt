import ThemeToggle from '../components/ThemeToggle';

export default function HomePage() {
  // Temporary placement: there is no header or nav to host the toggle in yet.
  return (
    <main>
      <ThemeToggle />
      <h1>Sorrel &amp; Salt</h1>
      <p>A compendium, ingredient store and grimoire.</p>
    </main>
  );
}
