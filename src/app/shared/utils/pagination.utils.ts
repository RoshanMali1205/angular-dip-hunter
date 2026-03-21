/**
 * Builds a page number array for pagination controls.
 * Returns page numbers with -1 as an ellipsis placeholder.
 * Example: [1, -1, 4, 5, 6, -1, 10]
 */
export function buildPageNumbers(currentPage: number, totalPages: number): number[] {
  const pages: number[] = [];

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  pages.push(1);

  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 3) {
    end = 4;
  } else if (currentPage >= totalPages - 2) {
    start = totalPages - 3;
  }

  if (start > 2) {
    pages.push(-1); // ellipsis
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages - 1) {
    pages.push(-1); // ellipsis
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}
