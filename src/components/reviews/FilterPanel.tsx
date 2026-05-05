"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";

export interface FilterState {
  priceRange: [number, number];
  verdicts: string[];
  minScore: number;
  brands: string[];
  features: string[];
}

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableBrands: string[];
  availableFeatures: string[];
  productCount: number;
  onReset: () => void;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  availableBrands,
  availableFeatures,
  productCount,
  onReset
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    verdict: true,
    score: false,
    brand: false,
    features: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updatePriceRange = (values: number[]) => {
    onFiltersChange({
      ...filters,
      priceRange: [values[0], values[1]]
    });
  };

  const toggleVerdict = (verdict: string) => {
    const newVerdicts = filters.verdicts.includes(verdict)
      ? filters.verdicts.filter(v => v !== verdict)
      : [...filters.verdicts, verdict];
    onFiltersChange({
      ...filters,
      verdicts: newVerdicts
    });
  };

  const toggleBrand = (brand: string) => {
    const newBrands = filters.brands.includes(brand)
      ? filters.brands.filter(b => b !== brand)
      : [...filters.brands, brand];
    onFiltersChange({
      ...filters,
      brands: newBrands
    });
  };

  const toggleFeature = (feature: string) => {
    const newFeatures = filters.features.includes(feature)
      ? filters.features.filter(f => f !== feature)
      : [...filters.features, feature];
    onFiltersChange({
      ...filters,
      features: newFeatures
    });
  };

  const hasActiveFilters = 
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 1000 ||
    filters.verdicts.length > 0 ||
    filters.minScore > 0 ||
    filters.brands.length > 0 ||
    filters.features.length > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
          <span className="text-sm text-gray-500">({productCount} products)</span>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-sm"
          >
            <X className="w-3 h-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <span className="font-medium text-gray-900">Price Range</span>
          {expandedSections.price ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.price && (
          <div className="space-y-3">
            <Slider
              value={filters.priceRange}
              onValueChange={updatePriceRange}
              min={0}
              max={1000}
              step={10}
              className="mt-2"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>${filters.priceRange[0]}</span>
              <span>${filters.priceRange[1]}+</span>
            </div>
          </div>
        )}
      </div>

      {/* Verdict Filter */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('verdict')}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <span className="font-medium text-gray-900">Expert Verdict</span>
          {expandedSections.verdict ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.verdict && (
          <div className="space-y-2">
            {["Must Buy", "Recommended", "Good Value", "Consider"].map(verdict => (
              <label key={verdict} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.verdicts.includes(verdict)}
                  onCheckedChange={() => toggleVerdict(verdict)}
                />
                <span className="text-sm text-gray-700">{verdict}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Minimum Score */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('score')}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <span className="font-medium text-gray-900">Minimum Score</span>
          {expandedSections.score ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.score && (
          <div className="space-y-3">
            <Slider
              value={[filters.minScore]}
              onValueChange={(values) => onFiltersChange({ ...filters, minScore: values[0] })}
              min={0}
              max={10}
              step={0.5}
              className="mt-2"
            />
            <div className="text-sm text-gray-600 text-center">
              {filters.minScore > 0 ? `${filters.minScore}+ / 10` : 'Any score'}
            </div>
          </div>
        )}
      </div>

      {/* Brand Filter */}
      {availableBrands.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => toggleSection('brand')}
            className="flex items-center justify-between w-full text-left mb-3"
          >
            <span className="font-medium text-gray-900">Brand</span>
            {expandedSections.brand ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.brand && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableBrands.map(brand => (
                <label key={brand} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.brands.includes(brand)}
                    onCheckedChange={() => toggleBrand(brand)}
                  />
                  <span className="text-sm text-gray-700">{brand}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Features Filter */}
      {availableFeatures.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => toggleSection('features')}
            className="flex items-center justify-between w-full text-left mb-3"
          >
            <span className="font-medium text-gray-900">Features</span>
            {expandedSections.features ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.features && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableFeatures.map(feature => (
                <label key={feature} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.features.includes(feature)}
                    onCheckedChange={() => toggleFeature(feature)}
                  />
                  <span className="text-sm text-gray-700">{feature}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}