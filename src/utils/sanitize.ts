// Frontend input sanitization utilities

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove script tags and javascript: protocols
  let sanitized = input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '');

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized.trim();
};

/**
 * Sanitize HTML content for display
 */
export const sanitizeHtml = (html: string): string => {
  if (!html || typeof html !== 'string') return '';
  
  // Create a temporary div to parse HTML
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Remove dangerous elements
  const dangerousElements = div.querySelectorAll('script, iframe, object, embed, link, meta, style');
  dangerousElements.forEach(el => el.remove());
  
  // Remove dangerous attributes
  const allElements = div.querySelectorAll('*');
  allElements.forEach(el => {
    // Remove event handler attributes
    const attributes = Array.from(el.attributes);
    attributes.forEach(attr => {
      if (attr.name.startsWith('on') || attr.name === 'style') {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  return div.innerHTML;
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validate and sanitize group name
 */
export const sanitizeGroupName = (name: string): string => {
  return sanitizeInput(name, 100);
};

/**
 * Validate and sanitize display name
 */
export const sanitizeDisplayName = (name: string): string => {
  return sanitizeInput(name, 100);
};

/**
 * Validate and sanitize recording title
 */
export const sanitizeRecordingTitle = (title: string): string => {
  return sanitizeInput(title, 200);
};

/**
 * Validate and sanitize message content
 */
export const sanitizeMessageContent = (content: string): string => {
  return sanitizeInput(content, 10000);
};