import { useState, useEffect } from 'react';
import { Book } from '../types/book';
import { getEditorsPicks } from '../services/books';
import { getCachedData, setCachedData } from '../services/cache';

interface BookSections {
  editorsPicks: Book[];
}

const TWO_DAYS_MS = 1000 * 60 * 60 * 48; // 48 hours in milliseconds

export function useAutoRefreshBooks() {
  const [books, setBooks] = useState<BookSections>({
    editorsPicks: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check cache first with 48-hour duration
        const cachedBooks = getCachedData<BookSections>('homepage-books', TWO_DAYS_MS);
        if (cachedBooks) {
          setBooks(cachedBooks);
          setIsLoading(false);
          return;
        }

        // If no cache or expired, fetch fresh data
        const picks = await getEditorsPicks();

        const newBooks = {
          editorsPicks: picks
        };

        // Update cache and state
        setCachedData('homepage-books', newBooks);
        setBooks(newBooks);
      } catch (err) {
        setError('Failed to load books');
        console.error('Error loading books:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBooks();

    // Set up auto-refresh every 48 hours
    const refreshInterval = setInterval(loadBooks, TWO_DAYS_MS);
    return () => clearInterval(refreshInterval);
  }, []);

  return { ...books, isLoading, error };
}