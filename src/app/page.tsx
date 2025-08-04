import styles from './page.module.css';
import Link from 'next/link';

// Organize apps by category
const appCategories = [
  {
    title: 'Games',
    description: 'Brain teasers and fun puzzles',
    apps: [
      {
        name: 'Hardle',
        path: '/hardle'
      },
      {
        name: 'Randle',
        path: '/randle'
      },
      {
        name: '15 Puzzle',
        path: '/15puzzle/daily'
      },
      {
        name: 'Picture Puzzle',
        path: '/picturepuzzle/daily'
      },
      {
        name: 'Survivor Puzzle',
        path: '/survivorpuzzle'
      },
      {
        name: 'Rankings',
        path: '/rankings'
      },
    ]
  },
  {
    title: 'Productivity Apps',
    description: 'Tools to help you work smarter',
    apps: [
      {
        name: 'Beautiful Mind',
        path: '/beautifulmind'
      },
      {
        name: 'OpenMind',
        path: '/openmind'
      },
      {
        name: 'BirdWatch',
        path: '/birdwatch'
      },
    ]
  }
];

export default function Home() {
  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>we create this</h1>
      </header>
      <main className={styles.appList}>
        <div className={styles.appContainer}>
          {appCategories.map((category, index) => (
            <div key={index} className={styles.category}>
              <h2 className={styles.categoryTitle}>{category.title}</h2>
              <p className={styles.categoryDescription}>{category.description}</p>
              <div className={styles.appsGrid}>
                {category.apps.map((app) => (
                  <Link 
                    key={app.path} 
                    href={app.path}
                    className={styles.app}
                  >
                    {app.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}