"use client";

import { ArrowLeft, ArrowRight } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { cx } from "@repo/ui/utils";

interface TransactionsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Pagination controls for the transactions table
 *
 * Shows "Showing X-Y of Z" text and page navigation buttons.
 */
export function TransactionsPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  className,
}: TransactionsPaginationProps) {
  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalCount);
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  // Generate page numbers to show
  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalCount === 0) {
    return null;
  }

  return (
    <div
      className={cx(
        "flex items-center justify-between border-t border-secondary px-4 py-3 lg:px-6",
        className
      )}
    >
      {/* Left: Showing X-Y of Z */}
      <p className="text-sm text-secondary">
        Showing{" "}
        <span className="font-medium text-primary">{startItem.toLocaleString()}</span>
        {" - "}
        <span className="font-medium text-primary">{endItem.toLocaleString()}</span>
        {" of "}
        <span className="font-medium text-primary">{totalCount.toLocaleString()}</span>
      </p>

      {/* Center: Page Numbers (desktop only) */}
      <nav
        className="hidden items-center gap-0.5 md:flex"
        aria-label="Pagination"
      >
        {getPageNumbers().map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex size-10 items-center justify-center text-sm text-tertiary"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={cx(
                "flex size-10 items-center justify-center rounded-lg text-sm font-medium transition-colors duration-100",
                page === currentPage
                  ? "bg-primary_hover text-secondary"
                  : "text-quaternary hover:bg-primary_hover hover:text-secondary"
              )}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          )
        )}
      </nav>

      {/* Mobile: Page X of Y */}
      <span className="text-sm text-secondary md:hidden">
        Page <span className="font-medium text-primary">{currentPage}</span> of{" "}
        <span className="font-medium text-primary">{totalPages}</span>
      </span>

      {/* Right: Previous/Next buttons */}
      <div className="flex items-center gap-3">
        <Button
          color="secondary"
          size="sm"
          iconLeading={ArrowLeft}
          isDisabled={!hasPrevious}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <span className="hidden md:inline">Previous</span>
        </Button>
        <Button
          color="secondary"
          size="sm"
          iconTrailing={ArrowRight}
          isDisabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span className="hidden md:inline">Next</span>
        </Button>
      </div>
    </div>
  );
}
