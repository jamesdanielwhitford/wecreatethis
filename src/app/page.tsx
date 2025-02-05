import styles from './page.module.css';
import Link from 'next/link';

const apps = [
  {
    name: 'AI Meme of the Day',
    path: '/aimemeoftheday'
  },
  // Add more apps here as needed
];

export default function Home() {
  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>We create this.</h1>
      </header>
      <main className={styles.appList}>
        <div className={styles.appContainer}>
          {apps.map((app) => (
            <Link 
              key={app.path} 
              href={app.path}
              className={styles.app}
            >
              {app.name}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}