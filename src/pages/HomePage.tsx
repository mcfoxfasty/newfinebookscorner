import React from 'react';
import { Hero } from '../components/Hero';
import { Stats } from '../components/Stats';
import { BookBrowser } from '../components/BookBrowser';
import { BookSection } from '../components/BookSection';
import { CategorySection } from '../components/CategorySection';
import { CategoryBrowser } from '../components/CategoryBrowser';
import { ArticleSection } from '../components/ArticleSection';
import { PromotionBanner } from '../components/PromotionBanner';
import { useAutoRefreshBooks } from '../hooks/useAutoRefreshBooks';

export function HomePage() {
  const { editorsPicks, isLoading } = useAutoRefreshBooks();

  return (
    <main>
      <Hero />
      <Stats />
      <CategoryBrowser />
      <section className="py-12 bg-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-navy mb-8">Browse Our Collection</h2>
          <BookBrowser />
        </div>
      </section>
      <BookSection 
        title="Editor's Picks" 
        books={editorsPicks} 
        viewAllLink="/editors-picks"
        isLoading={isLoading}
      />
      <CategorySection category="Mystery" viewAllLink="/category/mystery" />
      <CategorySection category="Romance" viewAllLink="/category/romance" />
      <CategorySection category="Science Fiction" viewAllLink="/category/science-fiction" />
      <PromotionBanner />
      <ArticleSection />
    </main>
  );
}