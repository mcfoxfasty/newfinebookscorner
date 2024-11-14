import { Book, BookDetails } from '../types/book';
import { sampleBooks, editorsPickBooks, sampleBookDetails } from '../data/books';
import { getNextApiKey } from './apiKeys';
import { getCachedData, setCachedData } from './cache';

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

const handleApiError = (error: unknown, fallbackData: any) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  console.warn(`Using fallback data. ${errorMessage}`);
  return fallbackData;
};

const validateApiResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  const data = await response.json();
  if (!data) {
    throw new Error('No data received from API');
  }
  return data;
};

const determineBookCondition = (saleInfo: any): boolean => {
  if (saleInfo?.saleability === 'FOR_SALE' && saleInfo?.isEbook) {
    return false;
  }
  return Math.random() < 0.3;
};

const getHighQualityCover = (imageLinks: any): string => {
  if (!imageLinks) return 'https://via.placeholder.com/240x360?text=No+Cover';
  
  const coverUrl = imageLinks.extraLarge || 
                  imageLinks.large || 
                  imageLinks.medium || 
                  imageLinks.thumbnail || 
                  'https://via.placeholder.com/240x360?text=No+Cover';

  return coverUrl
    .replace('http:', 'https:')
    .replace(/&zoom=\d+/, '&zoom=1')
    .replace(/&edge=curl/, '');
};

const mapBookData = (item: any): Book => {
  const isUsed = determineBookCondition(item.saleInfo);
  const coverUrl = getHighQualityCover(item.volumeInfo?.imageLinks);

  return {
    id: item.id,
    title: item.volumeInfo?.title || 'Untitled',
    author: item.volumeInfo?.authors?.[0] || 'Unknown Author',
    description: item.volumeInfo?.description || 'No description available',
    coverUrl,
    rating: item.volumeInfo?.averageRating || Math.floor(Math.random() * 2) + 3,
    reviewCount: item.volumeInfo?.ratingsCount || Math.floor(Math.random() * 1000),
    categories: item.volumeInfo?.categories || [],
    publishedDate: item.volumeInfo?.publishedDate || new Date().toISOString(),
    isUsed: isUsed,
    reviews: [],
    condition: isUsed ? 'Good' : 'New',
    format: item.saleInfo?.isEbook ? 'Ebook' : 'Paperback',
    downloadLink: item.accessInfo?.epub?.downloadLink || item.accessInfo?.pdf?.downloadLink,
    previewLink: item.volumeInfo?.previewLink,
    amazonLink: item.saleInfo?.buyLink
  };
};

async function fetchWithCache<T>(cacheKey: string, fetcher: () => Promise<T>, fallbackData: T): Promise<T> {
  const cachedData = getCachedData<T>(cacheKey);
  if (cachedData) return cachedData;

  try {
    const data = await fetcher();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    return handleApiError(error, fallbackData);
  }
}

export async function searchBooks(
  query: string,
  category?: string,
  sortBy: 'relevance' | 'newest' = 'relevance',
  startIndex: number = 0,
  maxResults: number = 20
): Promise<{ books: Book[], totalItems: number }> {
  const cacheKey = `search-${query}-${category}-${sortBy}-${startIndex}-${maxResults}`;

  return fetchWithCache(cacheKey, async () => {
    let searchQuery = query;
    if (category) {
      searchQuery += `+subject:${category}`;
    }

    const response = await fetch(
      `${BASE_URL}?q=${encodeURIComponent(searchQuery)}&startIndex=${startIndex}&maxResults=${maxResults}&orderBy=${sortBy}&key=${getNextApiKey()}`
    );

    const data = await validateApiResponse(response);
    const books = data.items
      ?.filter((item: any) => item.volumeInfo?.imageLinks)
      ?.map(mapBookData) || [];

    return {
      books,
      totalItems: data.totalItems || 0
    };
  }, { books: sampleBooks, totalItems: sampleBooks.length });
}

export async function getFinanceBooks(): Promise<Book[]> {
  const cacheKey = 'finance-books';
  
  return fetchWithCache(cacheKey, async () => {
    const queries = [
      'subject:finance+intitle:investing',
      'subject:business+intitle:finance',
      'subject:economics+intitle:market',
      'subject:trading+intitle:stock',
      'subject:personal+intitle:finance',
      'subject:money+intitle:management'
    ];

    const booksPromises = queries.map(async (query) => {
      const response = await fetch(
        `${BASE_URL}?q=${encodeURIComponent(query)}&orderBy=relevance&maxResults=5&key=${getNextApiKey()}`
      );
      
      const data = await validateApiResponse(response);
      return data.items
        ?.filter((item: any) => 
          item.volumeInfo?.imageLinks && 
          new Date(item.volumeInfo?.publishedDate).getFullYear() >= 2020 &&
          item.volumeInfo?.averageRating >= 4
        )
        .map(mapBookData) || [];
    });

    const allBooks = (await Promise.all(booksPromises)).flat();
    
    const uniqueBooks = Array.from(new Map(allBooks.map(book => [book.id, book])).values());
    
    return uniqueBooks
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.reviewCount - a.reviewCount;
      })
      .slice(0, 10);
  }, sampleBooks);
}

export async function getEditorsPicks(): Promise<Book[]> {
  const cacheKey = 'editors-picks';
  
  return fetchWithCache(cacheKey, async () => {
    const editorPickTitles = [
      'Project Hail Mary by Andy Weir',
      'Tomorrow, and Tomorrow, and Tomorrow by Gabrielle Zevin',
      'Demon Copperhead by Barbara Kingsolver',
      'Fourth Wing by Rebecca Yarros',
      'Iron Flame by Rebecca Yarros',
      'House of Flame and Shadow by Sarah J. Maas',
      'The Woman in Me by Britney Spears',
      'Hell Bent by Leigh Bardugo'
    ];

    const booksPromises = editorPickTitles.map(async (title) => {
      const [bookTitle, author] = title.split(' by ');
      const query = `intitle:"${bookTitle}" inauthor:"${author}"`;
      const response = await fetch(
        `${BASE_URL}?q=${encodeURIComponent(query)}&maxResults=1&key=${getNextApiKey()}`
      );
      const data = await validateApiResponse(response);
      return data.items?.[0] && data.items[0].volumeInfo?.imageLinks 
        ? mapBookData(data.items[0]) 
        : null;
    });

    const books = await Promise.all(booksPromises);
    return books.filter((book): book is Book => book !== null);
  }, editorsPickBooks);
}

export async function searchBooksByCategory(
  category: string,
  maxResults: number = 10,
  orderBy: 'relevance' | 'newest' = 'relevance'
): Promise<Book[]> {
  const cacheKey = `category-${category}-${maxResults}-${orderBy}`;
  
  return fetchWithCache(cacheKey, async () => {
    const response = await fetch(
      `${BASE_URL}?q=subject:${encodeURIComponent(category)}&maxResults=${maxResults}&orderBy=${orderBy}&key=${getNextApiKey()}`
    );
    
    const data = await validateApiResponse(response);
    return data.items
      ?.filter((item: any) => item.volumeInfo?.imageLinks)
      ?.map(mapBookData) || [];
  }, sampleBooks);
}

export async function getBookDetails(bookId: string): Promise<BookDetails> {
  const cacheKey = `book-details-${bookId}`;
  
  return fetchWithCache(cacheKey, async () => {
    const response = await fetch(`${BASE_URL}/${bookId}?key=${getNextApiKey()}`);
    const item = await validateApiResponse(response);
    
    const isUsed = determineBookCondition(item.saleInfo);
    const coverUrl = getHighQualityCover(item.volumeInfo?.imageLinks);

    return {
      id: item.id,
      title: item.volumeInfo?.title || 'Untitled',
      subtitle: item.volumeInfo?.subtitle || '',
      authors: item.volumeInfo?.authors || ['Unknown Author'],
      description: item.volumeInfo?.description || 'No description available',
      coverUrl,
      rating: item.volumeInfo?.averageRating || Math.floor(Math.random() * 2) + 3,
      ratingsCount: item.volumeInfo?.ratingsCount || Math.floor(Math.random() * 1000),
      reviewCount: item.volumeInfo?.ratingsCount || Math.floor(Math.random() * 1000),
      categories: item.volumeInfo?.categories || [],
      pageCount: item.volumeInfo?.pageCount || 0,
      publisher: item.volumeInfo?.publisher || 'Unknown Publisher',
      publishedDate: item.volumeInfo?.publishedDate || '',
      isbn: item.volumeInfo?.industryIdentifiers?.[0]?.identifier || '',
      language: item.volumeInfo?.language || 'en',
      isUsed: isUsed,
      reviews: [],
      condition: isUsed ? 'Good' : 'New',
      format: item.saleInfo?.isEbook ? 'Ebook' : 'Paperback',
      downloadLink: item.accessInfo?.epub?.downloadLink || item.accessInfo?.pdf?.downloadLink,
      previewLink: item.volumeInfo?.previewLink,
      amazonLink: item.saleInfo?.buyLink
    };
  }, sampleBookDetails);
}