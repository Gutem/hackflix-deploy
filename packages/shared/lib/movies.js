/**
 * Movie data helpers for loading, filtering, sorting, and paginating movies.
 * @module packages/shared/lib/movies
 */

let moviesCache = null;

/**
 * Load movies from the JSON data source
 * @returns {Promise<Array<Object>>} Array of movies
 */
export async function loadMovies() {
  if (moviesCache) {
    return moviesCache;
  }

  try {
    const response = await fetch("/mock-data/movies.json");
    if (!response.ok) {
      throw new Error(`Failed to load movies: ${response.status}`);
    }
    const data = await response.json();
    moviesCache = data.movies || [];
    return moviesCache;
  } catch (error) {
    console.error("Error loading movies:", error);
    return [];
  }
}

/**
 * Get a movie by ID
 * @param {string} movieId - Movie ID
 * @param {Array<Object>} movies - Movies array (optional, uses cache if not provided)
 * @returns {Promise<Object|null>} Movie or null
 */
export async function getMovieById(movieId, movies = null) {
  const moviesList = movies || (await loadMovies());
  return moviesList.find((m) => m.id === movieId) || null;
}

/**
 * Get movies filtered by category
 * @param {string} category - Category to filter by
 * @param {Array<Object>} movies - Movies array (optional, uses cache if not provided)
 * @returns {Promise<Array<Object>>} Filtered movies
 */
export async function getMoviesByCategory(category, movies = null) {
  const moviesList = movies || (await loadMovies());
  const normalizedCategory = category.toLowerCase();
  
  return moviesList.filter((m) =>
    m.categories.map((c) => c.toLowerCase()).includes(normalizedCategory)
  );
}

/**
 * Get all unique categories from movies
 * @param {Array<Object>} movies - Movies array (optional, uses cache if not provided)
 * @returns {Promise<Array<string>>} Sorted array of unique categories
 */
export async function getCategories(movies = null) {
  const moviesList = movies || (await loadMovies());
  const categorySet = new Set();
  
  for (const movie of moviesList) {
    for (const category of movie.categories) {
      categorySet.add(category.toLowerCase());
    }
  }
  
  return Array.from(categorySet).sort();
}

/**
 * Get featured movie (hero banner)
 * @param {Array<Object>} movies - Movies array (optional, uses cache if not provided)
 * @returns {Promise<Object|null>} Featured movie or null
 */
export async function getFeaturedMovie(movies = null) {
  const moviesList = movies || (await loadMovies());
  return moviesList.find((m) => m.featured === true) || null;
}

/**
 * Get trending movies sorted by rank
 * @param {Array<Object>} movies - Movies array (optional, uses cache if not provided)
 * @param {number} limit - Maximum number of movies to return
 * @returns {Promise<Array<Object>>} Trending movies
 */
export async function getTrendingMovies(movies = null, limit = 10) {
  const moviesList = movies || (await loadMovies());
  
  return moviesList
    .filter((m) => m.trending != null && m.trending > 0)
    .sort((a, b) => a.trending - b.trending)
    .slice(0, limit);
}

/**
 * Paginate movies
 * @param {Array<Object>} movies - Movies array
 * @param {Object} options - Pagination options
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.limit - Items per page
 * @returns {Promise<Object>} Paginated result
 */
export async function paginateMovies(movies, options = {}) {
  const { page = 1, limit = 20 } = options;
  const total = movies.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  
  return {
    movies: movies.slice(start, end),
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Sort movies by field
 * @param {Array<Object>} movies - Movies array
 * @param {Object} options - Sort options
 * @param {string} options.field - Field to sort by
 * @param {string} options.order - Sort order ('asc' or 'desc')
 * @returns {Promise<Array<Object>>} Sorted movies
 */
export async function sortMovies(movies, options = {}) {
  const { field = "title", order = "asc" } = options;
  const sorted = [...movies];
  
  sorted.sort((a, b) => {
    let valueA = a[field];
    let valueB = b[field];
    
    if (typeof valueA === "string") {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }
    
    if (valueA < valueB) return order === "asc" ? -1 : 1;
    if (valueA > valueB) return order === "asc" ? 1 : -1;
    return 0;
  });
  
  return sorted;
}

/**
 * Clear the movies cache
 */
export function clearMoviesCache() {
  moviesCache = null;
}

export default {
  loadMovies,
  getMovieById,
  getMoviesByCategory,
  getCategories,
  getFeaturedMovie,
  getTrendingMovies,
  paginateMovies,
  sortMovies,
  clearMoviesCache,
};
