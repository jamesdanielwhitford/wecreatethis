'use client';

import React from 'react';
import { BeautifulMindApp } from '@/apps/beautifulmind/BeautifulMindApp';
import styles from './page.module.css';

export default function BeautifulMindPage() {
  return (
    <div className={styles.container}>
      <BeautifulMindApp />
    </div>
  );
}