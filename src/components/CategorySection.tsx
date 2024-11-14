import React, { useState, useEffect } from 'react';
import { Book } from '../types/book';
import { BookSection } from './BookSection';
import { searchBooksByCategory } from '../services/books';
import { Loader } from './Loader';

interface CategorySectionProps {
  category: string;
  viewAllLink?: string;
}

export function CategorySection({ category, viewAllLink }: CategorySectionProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        // Ensure we get enough books by requesting more than needed
        const fetchedBooks = await searchBooksByCategory(category, 20, 'relevance');
        // Filter out books without images and limit to 10
        const validBooks = fetchedBooks
          .filter(book => book.coverUrl && !book.coverUrl.includes('placeholder'))
          .slice(0, 10);
        setBooks(validBooks);
      } catch (err) {
        setError('Failed to load books');
        console.error(`Error loading ${category} books:`, err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBooks();
  }, [category]);

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return null; // Hide section completely if there's an error
  }

  // Only render if we have books to show
  if (books.length === 0) {
    return null;
  }

  return (
    <BookSection 
      title={`${category} Books`} 
      books={books} 
      viewAllLink={viewAllLink} 
    />
  );
}