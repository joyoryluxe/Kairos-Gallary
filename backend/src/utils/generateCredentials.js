const { v4: uuidv4 } = require('uuid');

/**
 * Generates a unique client ID
 * @returns {string} e.g. KAI-XXXXXX
 */
const generateClientId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `KAI-${result}`;
};

/**
 * Generates a random alphanumeric password
 * @returns {string} e.g. aB2xY9
 */
const generatePassword = () => {
  return Math.random().toString(36).slice(-8).toUpperCase();
};

/**
 * Calculates expiry date based on days from now
 * @param {number} days 
 * @returns {Date}
 */
const getExpiryDate = (days = 8) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

/**
 * Generates a short unique photo display ID
 * @returns {string} e.g. IMG-A1B2
 */
const generatePhotoId = () => {
  return `IMG-${uuidv4().slice(0, 4).toUpperCase()}`;
};

module.exports = {
  generateClientId,
  generatePassword,
  getExpiryDate,
  generatePhotoId,
};
