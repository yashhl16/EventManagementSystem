import React from 'react';
import { Search, X } from 'lucide-react';

interface EventFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedPrice: string;
  onPriceChange: (price: string) => void;
  selectedVenueType: string;
  onVenueTypeChange: (type: string) => void;
  selectedStatus?: string;
  onStatusChange?: (status: string) => void;
  onReset: () => void;
}

const CATEGORIES = [
  'All',
  'Technical',
  'Hackathon',
  'Workshop',
  'Seminar',
  'Cultural',
  'Sports',
  'Conference',
];

export const EventFilters: React.FC<EventFiltersProps> = ({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedPrice,
  onPriceChange,
  selectedVenueType,
  onVenueTypeChange,
  selectedStatus,
  onStatusChange,
  onReset,
}) => {
  const hasActiveFilters =
    search ||
    selectedCategory !== 'All' ||
    selectedPrice !== 'all' ||
    selectedVenueType !== 'all' ||
    (selectedStatus && selectedStatus !== 'all');

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800/80 dark:bg-zinc-900/50 backdrop-blur-sm">
      {/* Top Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          maxLength={100}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by event title, topic, tags, keywords, or campus venue..."
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-10 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-indigo-500/60"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer border ${
                isSelected
                  ? 'border-indigo-500/50 bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Secondary Dropdown Selectors */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Price Filter */}
          <select
            value={selectedPrice}
            onChange={(e) => onPriceChange(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 cursor-pointer"
          >
            <option value="all">Pricing: All</option>
            <option value="false">Free Only</option>
            <option value="true">Paid Only</option>
          </select>

          {/* Venue Type */}
          <select
            value={selectedVenueType}
            onChange={(e) => onVenueTypeChange(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 cursor-pointer"
          >
            <option value="all">Format: In-person & Online</option>
            <option value="offline">On-Campus / In-Person</option>
            <option value="online">Online / Virtual</option>
            <option value="hybrid">Hybrid</option>
          </select>

          {/* Status Filter */}
          {onStatusChange && (
            <select
              value={selectedStatus || 'all'}
              onChange={(e) => onStatusChange(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  );
};
