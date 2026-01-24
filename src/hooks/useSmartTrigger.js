import { useState, useEffect } from 'react';

const CHECKPOINT_INTERVAL = 5; // Standard rule: Every 5 pages
const MIN_GAP_THRESHOLD = 3;   // Don't interrupt if end is < 3 pages away

export const useSmartTrigger = (currentPage, totalPages) => {
  const [triggerState, setTriggerState] = useState({ 
    show: false, 
    type: null // 'MICRO' or 'CHAPTER_END'
  });

  useEffect(() => {
    // 0. Safety check: Don't trigger on page 0 (start)
    if (!currentPage || !totalPages || currentPage === 0) {
      setTriggerState({ show: false, type: null });
      return;
    }

    // 1. Check for Chapter End (Highest Priority)
    // We use a small range (totalPages - 1) because EPUB page counts can be slightly off
    if (currentPage >= totalPages - 1) {
      setTriggerState({ show: true, type: 'CHAPTER_END' });
      return;
    }

    // 2. Check for Micro-Interval (Every 5 pages)
    if (currentPage % CHECKPOINT_INTERVAL === 0) {
      const pagesLeft = totalPages - currentPage;
      
      // THE LOGIC FIX:
      // If we are at Page 10, and Total is 12... 
      // pagesLeft = 2. Since 2 < 3, we SKIP the micro-checkpoint.
      // We just wait for the Chapter End.
      if (pagesLeft < MIN_GAP_THRESHOLD) {
        setTriggerState({ show: false, type: null });
      } else {
        setTriggerState({ show: true, type: 'MICRO' });
      }
      return;
    }

    // 3. Otherwise, hide button
    setTriggerState({ show: false, type: null });

  }, [currentPage, totalPages]);

  return triggerState;
};