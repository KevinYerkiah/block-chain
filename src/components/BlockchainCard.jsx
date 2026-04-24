import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import BlockchainGraph from './BlockchainGraph';
import styles from './BlockchainCard.module.css';

export default function BlockchainCard({ onRecordsFetched }) {
  const [records, setRecords] = useState([]);
  const [totalConfessions, setTotalConfessions] = useState(0);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch blockchain records
      const { data: blockchainData, error: blockchainError } = await supabase
        .from('blockchain_sync_log')
        .select('id, entity_id, tx_hash, synced_at')
        .eq('status', 'confirmed')
        .eq('entity_type', 'confession')
        .order('synced_at', { ascending: true });

      if (blockchainError) throw blockchainError;

      // Fetch total confessions count
      const { count, error: countError } = await supabase
        .from('confessions')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false);

      if (countError) throw countError;

      setRecords(blockchainData || []);
      setTotalConfessions(count || 0);
      setError(false);
      
      // Share records with parent
      if (onRecordsFetched) {
        onRecordsFetched(blockchainData || []);
      }
    } catch (err) {
      console.error('Failed to fetch blockchain data:', err);
      setError(true);
    }
  }

  const percentage = totalConfessions > 0 
    ? Math.round((records.length / totalConfessions) * 100) 
    : 0;

  if (error) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.icon}>⛓</span>
          <span className={styles.title}>Blockchain</span>
        </div>
        <p className={styles.errorText}>Blockchain data unavailable</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.card} onClick={() => setIsGraphOpen(true)}>
        <div className={styles.header}>
          <span className={styles.icon}>⛓</span>
          <span className={styles.title}>Blockchain</span>
        </div>

        <div className={styles.preview}>
          {records.length === 0 ? (
            <svg width="100%" height="48" viewBox="0 0 200 48">
              <line 
                x1="20" 
                y1="24" 
                x2="180" 
                y2="24" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeDasharray="6 4"
                opacity="0.3"
              />
              <circle cx="100" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            </svg>
          ) : (
            <svg width="100%" height="48" viewBox="0 0 200 48">
              {/* Mini network preview - show first 5 nodes as static circles connected by lines */}
              {records.slice(0, 5).map((_, i) => {
                const positions = [
                  { x: 40, y: 24 },
                  { x: 70, y: 18 },
                  { x: 100, y: 30 },
                  { x: 130, y: 20 },
                  { x: 160, y: 26 },
                ];
                const pos = positions[i];
                const nextPos = positions[i + 1];
                
                return (
                  <g key={i}>
                    {nextPos && (
                      <line 
                        x1={pos.x} 
                        y1={pos.y} 
                        x2={nextPos.x} 
                        y2={nextPos.y} 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        opacity="0.3"
                      />
                    )}
                    <circle 
                      cx={pos.x} 
                      cy={pos.y} 
                      r="5" 
                      fill="currentColor" 
                      opacity="0.4" 
                    />
                  </g>
                );
              })}
              {records.length > 5 && (
                <text x="190" y="28" fontSize="12" fill="currentColor" opacity="0.4" textAnchor="end">
                  +{records.length - 5}
                </text>
              )}
            </svg>
          )}
        </div>

        <div className={styles.stats}>
          {records.length === 0 ? (
            <p className={styles.waitingText}>Waiting for first confession on blockchain...</p>
          ) : (
            <>
              <p className={styles.count}>
                {records.length} confession{records.length !== 1 ? 's' : ''} on blockchain
              </p>
              <p className={styles.percentage}>{percentage}% of total confessions</p>
            </>
          )}
        </div>

        <p className={styles.cta}>Click to explore →</p>
      </div>

      {isGraphOpen && (
        <BlockchainGraph 
          isOpen={isGraphOpen} 
          onClose={() => setIsGraphOpen(false)}
          initialRecords={records}
        />
      )}
    </>
  );
}
