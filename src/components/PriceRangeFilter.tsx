import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, RotateCcw, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';

interface PriceRangeFilterProps {
  minBound: number;
  maxBound: number;
  minPrice: number;
  maxPrice: number;
  currency: string;
  onChange: (min: number, max: number) => void;
  onReset: () => void;
  totalProductsCount: number;
  filteredProductsCount: number;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export default function PriceRangeFilter({
  minBound,
  maxBound,
  minPrice,
  maxPrice,
  currency,
  onChange,
  onReset,
  totalProductsCount,
  filteredProductsCount,
  sortBy,
  onSortChange,
}: PriceRangeFilterProps) {
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocalMin(minPrice);
  }, [minPrice]);

  useEffect(() => {
    setLocalMax(maxPrice);
  }, [maxPrice]);

  const minPercent = maxBound > minBound 
    ? Math.max(0, Math.min(100, ((localMin - minBound) / (maxBound - minBound)) * 100))
    : 0;
  
  const maxPercent = maxBound > minBound 
    ? Math.max(0, Math.min(100, ((localMax - minBound) / (maxBound - minBound)) * 100))
    : 100;

  const handleMinSlider = (val: number) => {
    const clampedVal = Math.min(val, localMax - 5);
    setLocalMin(clampedVal);
    onChange(clampedVal, localMax);
  };

  const handleMaxSlider = (val: number) => {
    const clampedVal = Math.max(val, localMin + 5);
    setLocalMax(clampedVal);
    onChange(localMin, clampedVal);
  };

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number(e.target.value) || 0;
    setLocalMin(num);
  };

  const handleMinInputBlur = () => {
    let validMin = Math.max(minBound, Math.min(localMin, localMax - 5));
    if (isNaN(validMin)) validMin = minBound;
    setLocalMin(validMin);
    onChange(validMin, localMax);
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number(e.target.value) || 0;
    setLocalMax(num);
  };

  const handleMaxInputBlur = () => {
    let validMax = Math.min(maxBound, Math.max(localMax, localMin + 5));
    if (isNaN(validMax)) validMax = maxBound;
    setLocalMax(validMax);
    onChange(localMin, validMax);
  };

  const applyPreset = (presetMin: number, presetMax: number) => {
    const boundedMin = Math.max(minBound, presetMin);
    const boundedMax = Math.min(maxBound, presetMax);
    setLocalMin(boundedMin);
    setLocalMax(boundedMax);
    onChange(boundedMin, boundedMax);
  };

  const isFilterActive = localMin > minBound || localMax < maxBound;

  const presets = [
    { label: `Under ${currency}150`, min: minBound, max: 150 },
    { label: `${currency}150 - ${currency}400`, min: 150, max: 400 },
    { label: `${currency}400 - ${currency}800`, min: 400, max: 800 },
    { label: `${currency}800+`, min: 800, max: maxBound },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 sm:p-3 shadow-2xs transition-all">
      {/* Compact Top Bar: Filter Button / Summary / Sort */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isOpen || isFilterActive
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            <span>Price Filter</span>
            {isFilterActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            )}
            {isOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
          </button>

          <span className="text-[11px] text-slate-500 hidden sm:inline">
            ({filteredProductsCount} of {totalProductsCount} items)
          </span>
        </div>

        {/* Sort and Reset controls */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-0.5 text-slate-600 text-xs">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent text-slate-700 text-xs py-0.5 font-medium focus:outline-none cursor-pointer"
            >
              <option value="featured">Featured</option>
              <option value="price_low">Price: Low-High</option>
              <option value="price_high">Price: High-Low</option>
              <option value="name_asc">Name: A-Z</option>
            </select>
          </div>

          {isFilterActive && (
            <button
              onClick={() => {
                setLocalMin(minBound);
                setLocalMax(maxBound);
                onReset();
              }}
              className="text-[11px] font-medium text-slate-500 hover:text-red-600 flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-red-50 transition-colors"
              title="Reset price filter"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span className="hidden xs:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Compact Price Filter Panel */}
      {isOpen && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2.5 animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Dual Slider */}
            <div className="md:col-span-7 space-y-1.5">
              <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                <span>Budget: <strong className="text-blue-600 font-semibold">{currency}{Math.round(localMin)}</strong></span>
                <span>to <strong className="text-blue-600 font-semibold">{currency}{Math.round(localMax)}</strong></span>
              </div>

              {/* Slider Track */}
              <div className="relative w-full h-5 flex items-center select-none">
                <div className="absolute w-full h-1.5 bg-slate-100 border border-slate-200 rounded-full" />
                <div
                  className="absolute h-1.5 bg-blue-600 rounded-full"
                  style={{
                    left: `${minPercent}%`,
                    width: `${Math.max(0, maxPercent - minPercent)}%`,
                  }}
                />

                <input
                  type="range"
                  min={minBound}
                  max={maxBound}
                  step={5}
                  value={localMin}
                  onChange={(e) => handleMinSlider(Number(e.target.value))}
                  aria-label="Minimum price"
                  className="absolute w-full appearance-none bg-transparent pointer-events-none z-20
                    [&::-webkit-slider-thumb]:pointer-events-auto 
                    [&::-webkit-slider-thumb]:appearance-none 
                    [&::-webkit-slider-thumb]:w-4 
                    [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:bg-white 
                    [&::-webkit-slider-thumb]:border-2 
                    [&::-webkit-slider-thumb]:border-blue-600 
                    [&::-webkit-slider-thumb]:shadow-xs 
                    [&::-webkit-slider-thumb]:cursor-grab
                    [&::-moz-range-thumb]:pointer-events-auto 
                    [&::-moz-range-thumb]:w-4 
                    [&::-moz-range-thumb]:h-4 
                    [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:bg-white 
                    [&::-moz-range-thumb]:border-2 
                    [&::-moz-range-thumb]:border-blue-600"
                />

                <input
                  type="range"
                  min={minBound}
                  max={maxBound}
                  step={5}
                  value={localMax}
                  onChange={(e) => handleMaxSlider(Number(e.target.value))}
                  aria-label="Maximum price"
                  className="absolute w-full appearance-none bg-transparent pointer-events-none z-30
                    [&::-webkit-slider-thumb]:pointer-events-auto 
                    [&::-webkit-slider-thumb]:appearance-none 
                    [&::-webkit-slider-thumb]:w-4 
                    [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:bg-white 
                    [&::-webkit-slider-thumb]:border-2 
                    [&::-webkit-slider-thumb]:border-blue-600 
                    [&::-webkit-slider-thumb]:shadow-xs 
                    [&::-webkit-slider-thumb]:cursor-grab
                    [&::-moz-range-thumb]:pointer-events-auto 
                    [&::-moz-range-thumb]:w-4 
                    [&::-moz-range-thumb]:h-4 
                    [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:bg-white 
                    [&::-moz-range-thumb]:border-2 
                    [&::-moz-range-thumb]:border-blue-600"
                />
              </div>
            </div>

            {/* Direct Input Boxes */}
            <div className="md:col-span-5 flex items-center gap-1.5">
              <div className="flex-1 relative">
                <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400 text-[11px] font-medium">
                  {currency}
                </span>
                <input
                  type="number"
                  min={minBound}
                  max={maxBound}
                  value={localMin}
                  onChange={handleMinInputChange}
                  onBlur={handleMinInputBlur}
                  aria-label="Min price"
                  className="w-full pl-5 pr-1.5 py-1 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <span className="text-slate-300 font-medium text-xs">-</span>

              <div className="flex-1 relative">
                <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400 text-[11px] font-medium">
                  {currency}
                </span>
                <input
                  type="number"
                  min={minBound}
                  max={maxBound}
                  value={localMax}
                  onChange={handleMaxInputChange}
                  onBlur={handleMaxInputBlur}
                  aria-label="Max price"
                  className="w-full pl-5 pr-1.5 py-1 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 flex-wrap pt-1">
            <span className="text-[10px] font-medium text-slate-400 mr-0.5">Presets:</span>
            {presets.map((p, idx) => {
              const isSelected = localMin === Math.max(minBound, p.min) && localMax === Math.min(maxBound, p.max);
              return (
                <button
                  key={idx}
                  onClick={() => applyPreset(p.min, p.max)}
                  className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
