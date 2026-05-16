import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to highlight search results on a page
 * Searches for text matching the query and highlights it with a scroll to the first match
 * 
 * Usage:
 * const { highlightedText } = useSearchHighlight();
 * 
 * Then use highlighted class in your JSX
 */
export function useSearchHighlight() {
  const location = useLocation();

  useEffect(() => {
    const state = location.state as any;
    const searchQuery = state?.searchQuery;

    if (!searchQuery) {
      return;
    }

    // Remove previous highlights
    document.querySelectorAll('.search-highlight').forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    });

    // Function to highlight text in a node
    const highlightTextNode = (node: Node, query: string): boolean => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const regex = new RegExp(`(${query})`, 'gi');

        if (regex.test(text)) {
          const span = document.createElement('span');
          const parts = text.split(regex);

          parts.forEach((part) => {
            if (part.toLowerCase() === query.toLowerCase()) {
              const highlight = document.createElement('span');
              highlight.className =
                'search-highlight bg-yellow-200 dark:bg-yellow-700 font-semibold px-1 rounded';
              highlight.textContent = part;
              span.appendChild(highlight);
            } else {
              span.appendChild(document.createTextNode(part));
            }
          });

          node.parentNode?.replaceChild(span, node);
          return true;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Skip script and style tags
        if (
          node.nodeName.toLowerCase() !== 'script' &&
          node.nodeName.toLowerCase() !== 'style' &&
          node.nodeName.toLowerCase() !== 'button'
        ) {
          // Clone array to avoid modification during iteration
          const childNodes = Array.from((node as Element).childNodes);
          childNodes.forEach((child) => {
            highlightTextNode(child, query);
          });
          return true;
        }
      }

      return false;
    };

    // Highlight text in main content area
    const mainContent = document.querySelector('main');
    if (mainContent) {
      highlightTextNode(mainContent, searchQuery);

      // Scroll to first highlight
      const firstHighlight = document.querySelector('.search-highlight');
      if (firstHighlight) {
        setTimeout(() => {
          firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }

    // Cleanup on unmount
    return () => {
      document.querySelectorAll('.search-highlight').forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
        }
      });
    };
  }, [location.state]);

  return {
    isHighlighting: !!(location.state as any)?.searchQuery,
    searchQuery: (location.state as any)?.searchQuery,
  };
}
