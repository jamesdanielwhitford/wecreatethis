import styles from './page.module.css';
import Link from 'next/link';

const apps = [
  {
    name: 'Beautiful Mind',
    path: '/beautifulmind'
  },
  {
    name: 'Hardle',
    path: '/hardle'
  },
  {
    name: 'Randle',
    path: '/randle'
  },
  {
    name: 'Boss Bitch',
    path: '/bossbitch'
  },
];

export default function Home() {
  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>we create this</h1>
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