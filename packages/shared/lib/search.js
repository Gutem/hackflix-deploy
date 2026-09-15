/**
 * Search functionality for movies with fuzzy matching and highlighting.
 * @module packages/shared/lib/search
 */

/**
 * Fuzzy match a query against a target string
 * @param {string} query - Search query
 * @param {string} target - Target string to match against
 * @param {number} threshold - Minimum score threshold (0-1)
 * @returns {{match: boolean, score: number}} Match result
 */
export function fuzzyMatch(query, target, threshold = 0.6) {
  if (!query || !target) {
    return { match: false, score: 0 };
  }

  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();

  if (queryLower === targetLower) {
    return { match: true, score: 1 };
  }

  if (targetLower.includes(queryLower)) {
    const ratio = queryLower.length / targetLower.length;
    return { match: true, score: 0.7 + ratio * 0.3 };
  }

  const targetWords = targetLower.split(/\s+/);
  for (const word of targetWords) {
    if (word.includes(queryLower)) {
      const ratio = queryLower.length / word.length;
      return { match: true, score: 0.5 + ratio * 0.3 };
    }
  }

  let queryIndex = 0;
  let consecutiveMatches = 0;
  let maxConsecutive = 0;
  
  for (let i = 0; i < targetLower.length && queryIndex < queryLower.length; i++) {
    if (targetLower[i] === queryLower[queryIndex]) {
      consecutiveMatches++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
      queryIndex++;
    } else {
      consecutiveMatches = 0;
    }
  }

  const charMatchScore = queryIndex / queryLower.length;
  const consecutiveBonus = maxConsecutive / queryLower.length;
  const score = charMatchScore * 0.5 + consecutiveBonus * 0.5;

  return {
    match: score >= threshold,
    score,
  };
}

/**
 * Highlight matching text with markers
 * @param {string} text - Original text
 * @param {string} query - Search query to highlight
 * @param {string} marker - Marker for highlighting (default: **)
 * @returns {string} Text with highlighted matches
 */
export function highlightMatch(text, query, marker = "**") {
  if (!query || !text) {
    return text;
  }

  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
  return text.replace(regex, `${marker}$1${marker}`);
}

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Calculate match score for a movie field
 * @param {string} query - Search query
 * @param {string} value - Field value
 * @param {number} weight - Weight for this field
 * @returns {{score: number, matched: boolean}} Score result
 */
function scoreField(query, value, weight = 1) {
  if (!value) {
    return { score: 0, matched: false };
  }

  const valueLower = value.toLowerCase();
  
  if (valueLower === query) {
    return { score: 1 * weight, matched: true };
  }

  if (valueLower.includes(query)) {
    const ratio = query.length / valueLower.length;
    return { score: (0.6 + ratio * 0.4) * weight, matched: true };
  }

  const words = valueLower.split(/\s+/);
  for (const word of words) {
    if (word === query) {
      return { score: 0.8 * weight, matched: true };
    }
    if (word.includes(query)) {
      const ratio = query.length / word.length;
      return { score: (0.4 + ratio * 0.4) * weight, matched: true };
    }
  }

  const result = fuzzyMatch(query, valueLower, 0.85);
  
  return {
    score: result.match ? result.score * weight * 0.5 : 0,
    matched: result.match,
  };
}

/**
 * Search movies by query across multiple fields.
 * Note: Not currently used by the backend (ContentService.search has its own impl),
 * but kept as library code for future use and test coverage.
 * @param {string} query - Search query
 * @param {Array<Object>} movies - Movies to search
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum results to return
 * @param {string} options.category - Filter by category
 * @param {number} options.yearFrom - Filter by minimum year
 * @param {number} options.yearTo - Filter by maximum year
 * @returns {Promise<Array<Object>>} Search results with scores
 */
export async function searchMovies(query, movies, options = {}) {
  const { limit = 50, category, yearFrom, yearTo } = options;
  const trimmedQuery = query.trim().toLowerCase();

  if (!trimmedQuery) {
    return [];
  }

  let filteredMovies = [...movies];

  if (category) {
    filteredMovies = filteredMovies.filter((m) =>
      m.categories.map((c) => c.toLowerCase()).includes(category.toLowerCase())
    );
  }

  if (yearFrom) {
    filteredMovies = filteredMovies.filter((m) => m.year >= yearFrom);
  }

  if (yearTo) {
    filteredMovies = filteredMovies.filter((m) => m.year <= yearTo);
  }

  const results = [];

  for (const movie of filteredMovies) {
    const titleScore = scoreField(trimmedQuery, movie.title, 3);
    const descScore = scoreField(trimmedQuery, movie.description, 1);
    
    let castScore = { score: 0, matched: false };
    if (movie.cast && movie.cast.length > 0) {
      for (const actor of movie.cast) {
        const actorResult = scoreField(trimmedQuery, actor, 2);
        if (actorResult.matched && actorResult.score > castScore.score) {
          castScore = actorResult;
        }
      }
    }

    const totalScore = titleScore.score + descScore.score + castScore.score;

    if (totalScore > 0) {
      let matchType = "description";
      if (titleScore.matched) {
        matchType = "title";
      } else if (castScore.matched) {
        matchType = "cast";
      }

      results.push({
        ...movie,
        score: totalScore,
        matchType,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

export default {
  searchMovies,
  fuzzyMatch,
  highlightMatch,
};
