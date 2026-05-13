import { set, get, del } from 'idb-keyval';

/**
 * Storage Service for managing local IndexedDB blobs
 */
export const localDb = {
  /**
   * @param {string} prefix e.g., 'pdf' or 'epub'
   * @param {string} id The book ID
   * @param {Blob|File} file The file content
   */
  saveBookFile: async (prefix, id, file) => {
    const key = `${prefix.toLowerCase()}_${id}`;
    return await set(key, file);
  },

  /**
   * @param {string} prefix e.g., 'pdf' or 'epub'
   * @param {string} id The book ID
   * @returns {Promise<Blob|File|undefined>}
   */
  getBookFile: async (prefix, id) => {
    const key = `${prefix.toLowerCase()}_${id}`;
    return await get(key);
  },

  /**
   * @param {string} prefix e.g., 'pdf' or 'epub'
   * @param {string} id The book ID
   */
  deleteBookFile: async (prefix, id) => {
    const key = `${prefix.toLowerCase()}_${id}`;
    return await del(key);
  }
};
