import styles from './page.module.css';
import Image from 'next/image';

export default function AIMemeOfTheDay() {
  return (
    <div className={styles.container}>
      <div className={styles.imageWrapper}>
        <Image
          src="/image.jpeg"
          alt="AI Generated Meme"
          width={800}
          height={600}
          className={styles.memeImage}
          priority
        />
      </div>
      <button className={styles.helpButton} aria-label="Help">
        ?
      </button>
    </div>
  );
}