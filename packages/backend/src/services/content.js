/**
 * Content service for managing and serving content
 * @module packages/backend/src/services/content
 */

export class ContentService {
  /**
   * @param {Object} options
   * @param {Array} options.contentDb - Content database
   * @param {Object} [options.conferenceAliases] - Map of conference name to array of alias patterns
   */
  constructor(options = {}) {
    this.contentDb = options.contentDb || [];
    this.connectors = new Map();
    this.conferenceAliases = options.conferenceAliases || {};
    this.contentMap = new Map();
    this._confStatsCache = null;
    this._buildContentMap();
  }

  /**
   * Build content map for O(1) lookups
   * @private
   */
  _buildContentMap() {
    this.contentMap.clear();
    for (const item of this.contentDb) {
      this.contentMap.set(item.id, item);
    }
  }

  /**
   * Get content by ID (O(1) lookup)
   * @param {string} contentId 
   * @returns {Object|undefined}
   * @private
   */
  _getContentById(contentId) {
    return this.contentMap.get(contentId);
  }

  /**
   * Register a content connector
   * @param {string} name 
   * @param {Object} connector 
   */
  registerConnector(name, connector) {
    this.connectors.set(name, connector);
  }

  /**
   * Check if user has access to content
   * @param {string} contentId 
   * @param {Object} user 
   * @returns {boolean}
   */
  hasAccess(contentId, user) {
    if (!user?.contentIds) return false;
    
    const content = this._getContentById(contentId);
    if (!content) return false;
    
    if (user.contentIds.includes("*")) return true;

    return user.contentIds.some(allowed => {
      if (allowed === contentId) return true;
      if (content.conference) {
        const confLower = content.conference.toLowerCase();
        const allowedLower = allowed.toLowerCase();
        if (confLower === allowedLower || confLower.startsWith(allowedLower)) return true;
      }
      if (content.source && allowed === content.source) return true;
      return false;
    });
  }

  /**
   * Get playlist for user
   * @param {Object} user 
   * @param {Object} options
   * @param {string} [options.source] - Filter by source
   * @param {string} [options.conference] - Filter by conference
   * @param {number} [options.limit] - Pagination limit
   * @param {number} [options.offset] - Pagination offset
   * @returns {Object}
   */
  getPlaylist(user, options = {}) {
    let items = this.contentDb.filter(item => this.hasAccess(item.id, user));

    if (options.source) {
      items = items.filter(i => i.source === options.source);
    }
    if (options.conference) {
      items = items.filter(i => i.conference === options.conference);
    }

    const total = items.length;

    if (options.offset !== undefined) {
      items = items.slice(options.offset);
    }
    if (options.limit !== undefined) {
      items = items.slice(0, options.limit);
    }

    return {
      items: items.map(this.sanitize),
      total,
      limit: options.limit,
      offset: options.offset
    };
  }

  /**
   * Get single content item
   * @param {string} contentId 
   * @param {Object} user 
   * @returns {Object|null}
   */
  getContent(contentId, user) {
    const content = this._getContentById(contentId);
    if (!content) return null;
    if (!this.hasAccess(contentId, user)) return null;
    
    return this.sanitize(content);
  }

  /**
   * Search content
   * @param {string} query 
   * @param {Object} user 
   * @param {Object} options 
   * @returns {Array}
   */
  search(query, user, options = {}) {
    const q = query.toLowerCase();
    let results = this.contentDb.filter(item => {
      if (!this.hasAccess(item.id, user)) return false;
      
      return (item.title?.toLowerCase().includes(q) ||
              item.description?.toLowerCase().includes(q) ||
              Array.isArray(item.speakers) && item.speakers.some(s => s.toLowerCase().includes(q)));
    });

    if (options.limit !== undefined) {
      results = results.slice(0, options.limit);
    }

    return results.map(this.sanitize);
  }

  /**
   * Get content by conference name (prefix match, case-insensitive).
   * Also matches via conferenceAliases and infocon path in frontendUrl.
   * Sorted by year descending, then title A-Z.
   * @param {string} conferenceName - Conference name or prefix
   * @param {string} [conferencePath] - InfoCon path for URL matching (e.g., "44CON/")
   * @returns {Array}
   */
  getContentByConference(conferenceName, conferencePath, user) {
    const lower = conferenceName.toLowerCase();
    const aliases = this.conferenceAliases[conferenceName] || [];
    const filterByAccess = user && user.contentIds && !user.contentIds.includes("*");

    return this.contentDb
      .filter(item => {
        if (!item.conference) return false;
        const confLower = item.conference.toLowerCase();

        if (confLower === lower || confLower.startsWith(lower)) return true;

        for (const alias of aliases) {
          if (confLower.includes(alias.toLowerCase())) return true;
        }

        if (conferencePath && item.frontendUrl) {
          const pathEncoded = conferencePath.replace(/ /g, "%20");
          if (item.frontendUrl.includes(pathEncoded)) return true;
          const pathDecoded = decodeURIComponent(conferencePath);
          if (item.frontendUrl.includes(pathDecoded)) return true;
        }

        return false;
      })
      .filter(item => filterByAccess ? this.hasAccess(item.id, user) : true)
      .sort((a, b) => {
        const yearDiff = (b.year || 0) - (a.year || 0);
        if (yearDiff !== 0) return yearDiff;
        return (a.title || "").localeCompare(b.title || "");
      })
      .map(this.sanitize);
  }

  /**
   * Sanitize content for API response
   * @param {Object} content 
   * @returns {Object}
   */
  sanitize(content) {
    const { internalNotes, ...result } = content;
    return result;
  }

  /**
   * Get cached per-conference edition/video counts.
   * @returns {Map<string, {editions: Set<number>, count: number}>}
   */
  getConferenceStats() {
    if (this._confStatsCache) return this._confStatsCache;
    const counts = new Map();
    for (const item of this.contentDb) {
      if (!item.conference) continue;
      const base = item.conference.replace(/\s+\d{4}$/, "").trim().toLowerCase();
      const cur = counts.get(base) || { editions: new Set(), count: 0 };
      cur.editions.add(item.year);
      cur.count++;
      counts.set(base, cur);
    }
    this._confStatsCache = counts;
    return counts;
  }

  /**
   * Invalidate cached conference stats (call after content is added).
   */
  _invalidateCache() {
    this._confStatsCache = null;
  }

  /**
   * Add content to database
   * @param {Object} content 
   */
  addContent(content) {
    this.contentDb.push(content);
    this.contentMap.set(content.id, content);
    this._invalidateCache();
  }

  /**
   * Load content from connector
   * @param {string} connectorName 
   * @param {Object} options 
   */
  async loadFromConnector(connectorName, options = {}) {
    const connector = this.connectors.get(connectorName);
    if (!connector) throw new Error(`Connector ${connectorName} not found`);

    const items = await connector.fetchAll(options.conference, options);
    items.forEach(item => {
      this.addContent({
        id: item.id,
        title: item.title,
        description: item.description,
        thumbnail: item.thumbnail,
        duration: item.duration,
        source: connectorName,
        conference: item.conference,
        speakers: item.speakers,
        videoUrl: item.videoUrl,
        languages: item.languages,
        subtitles: item.subtitles,
        tier: "basic"
      });
    });

    return items.length;
  }
}
