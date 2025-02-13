'use client';
import React from 'react';
import { HelpCircle } from 'lucide-react';
import styles from './styles.module.css';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDaily?: boolean;
}

interface ExampleProps {
  word: string;
  score: number;
  description: string;
  type?: 'red' | 'orange' | 'green';
  marks?: ('red' | 'green')[];
}

function Example({ word, score, description, type = 'orange', marks }: ExampleProps) {
  return (
    <div className={styles.example}>
      <div className={styles.exampleRow}>
        {word.split('').map((letter, index) => (
          <div
            key={index}
            className={`
              ${styles.exampleTile}
              ${type === 'red' ? styles.red : ''}
              ${type === 'orange' ? styles.orange : ''}
              ${type === 'green' ? styles.green : ''}
              ${marks && marks[index] === 'red' ? styles.redMark : ''}
              ${marks && marks[index] === 'green' ? styles.greenMark : ''}
            `}
          >
            {letter}
          </div>
        ))}
        <div className={styles.exampleScore}>{score}</div>
      </div>
      <p className={styles.exampleDescription}>{description}</p>
    </div>
  );
}

function RulesModal({ isOpen, onClose, isDaily = false }: RulesModalProps) {
  if (!isOpen) return null;
  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        <h2>How To Play</h2>
        <p className={styles.mainInstruction}>
          {isDaily ? "Guess today's 4-letter word in 8 tries." : "Guess the 4-letter word in 8 tries."}
        </p>
        <div className={styles.subInstruction}>
          After each guess, see:
        </div>
        <div className={styles.examples}>
          <Example
            word="WORD"
            score={2}
            description="Orange means your letters might be in the target word. Your score showing how many letters are in the target word."
            type="orange"
          />
          <Example
            word="WOLF"
            score={0}
            description="Red means 0 letters match - great for eliminating letters!"
            type="red"
          />
          <Example
            word="RUDE"
            score={2}
            description="Tap orange tiles to mark them red or green to track your thinking."
            type="orange"
            marks={['green', 'red', 'green', 'red']}
          />
          <Example
            word="DRIP"
            score={4}
            description="Green means you win!"
            type="green"
          />
        </div>
        <div className={styles.tips}>
          <h3>Pro Tips</h3>
          <ul>
            <li>Getting 0 helps rule out multiple letters</li>
            <li>Mark letters to track your deductions</li>
            <li>Use process of elimination</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function RulesButton({ isDaily }: { isDaily?: boolean }) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={styles.iconButton}
        aria-label="Rules"
      >
        <HelpCircle size={20} />
      </button>
      {isOpen && (
        <RulesModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          isDaily={isDaily}
        />
      )}
    </>
  );
}