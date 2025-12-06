import React from 'react';

// Generic shimmer placeholder component
export const ShimmerBox = ({ 
  width = "w-full", 
  height = "h-4", 
  className = "",
  rounded = "rounded"
}) => (
  <div className={`${width} ${height} ${rounded} bg-gray-200 animate-pulse relative overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"></div>
  </div>
);

// Shimmer for images specifically
export const ShimmerImage = ({ 
  width = "w-full", 
  height = "h-64", 
  className = "",
  rounded = "rounded"
}) => (
  <div className={`${width} ${height} ${rounded} bg-gray-200 animate-pulse relative overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"></div>
  </div>
);

// Shimmer for text lines
export const ShimmerText = ({ 
  width = "w-3/4", 
  height = "h-4", 
  className = ""
}) => (
  <ShimmerBox 
    width={width} 
    height={height} 
    className={className}
    rounded="rounded"
  />
);

// Shimmer for game card layout
export const ShimmerGameCard = () => (
  <div className="w-full max-w-64 mx-auto py-5">
    <div className="relative">
      <ShimmerImage height="h-64" />
    </div>
    <div className="py-3 space-y-2">
      <ShimmerText width="w-full" height="h-5" />
      <ShimmerText width="w-2/3" height="h-4" />
    </div>
  </div>
);

// Loading state for search results
export const ShimmerSearchResults = ({ count = 3 }) => (
  <div className="space-y-1">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center p-4 border-b border-gray-100">
        <ShimmerImage width="w-16" height="h-16" />
        <div className="ml-4 flex-1 space-y-2">
          <ShimmerText width="w-3/4" height="h-5" />
          <ShimmerText width="w-1/2" height="h-4" />
        </div>
      </div>
    ))}
  </div>
);

export default ShimmerBox;