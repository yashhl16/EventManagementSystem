import React from 'react';
import { Search, Filter, X, Sparkles } from 'lucide-react';
import { EventCategory } from '../../types';

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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Top Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          maxLength={100}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by event title, topic, tags, keywords, or campus venue..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-900"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Secondary Dropdown Selectors */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Price Filter */}
          <select
            value={selectedPrice}
            onChange={(e) => onPriceChange(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">Pricing: All</option>
            <option value="false">Free Only</option>
            <option value="true">Paid Only</option>
          </select>

          {/* Venue Type */}
          <select
            value={selectedVenueType}
            onChange={(e) => onVenueTypeChange(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
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
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
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
