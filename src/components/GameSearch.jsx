import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
// import { isMobile } from "react-device-detect"; (barcode scanner removed)
import psLogo from "../ps-logo.svg";

// Shimmer placeholder component
const ShimmerImage = ({ width = "w-16", height = "h-16", className = "" }) => (
  <div className={`${width} ${height} bg-gray-200 rounded animate-pulse relative overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"></div>
  </div>
);

// Game image component with loading state
const GameImage = ({ src, alt, className, fallbackSrc = psLogo }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setImgSrc(src);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    setImgSrc(fallbackSrc);
  };

  return (
    <div className="relative">
      {isLoading && <ShimmerImage className={className || ""} />}
      <img
        src={imgSrc || fallbackSrc}
        alt={alt || "Game image"}
        className={`${className || ""} ${isLoading ? 'opacity-0 absolute' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
};

const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY || "";
const RAWG_BASE_URL = "https://api.rawg.io/api";

const GameSearch = ({
  onGameAdd,
  onToggleManualForm,
  showManualForm,
  onUpdateMissingImages,
  onUpdateMissingInformation,
  hasGames,
  isUpdatingImages,
  existingGames = [], // Add this prop to track existing games
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedGameForPlatforms, setSelectedGameForPlatforms] =
    useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [addToWishlist, setAddToWishlist] = useState(false);

  // Helper function to check if a game has been recently added
  const isGameRecentlyAdded = (gameId) => {
    return existingGames.some(
      (game) => game.id === gameId || game.rawgId === gameId
    );
  };

  // Search games from RAWG API
  const searchGames = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(
          query
        )}&page_size=10`
      );

      if (!response.ok) throw new Error("Failed to fetch games");

      const data = await response.json();
      setSearchResults(data.results || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Error searching games:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debounce
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery) {
        searchGames(searchQuery);
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  // Handle adding game from search results
  const handleSelectPlatforms = (game) => {
    setSelectedGameForPlatforms(game);
    setSelectedPlatforms([]);
  };

  // Add keyboard support for closing modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && selectedGameForPlatforms) {
        handleCancelPlatformSelection();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedGameForPlatforms]);

  const handlePlatformToggle = (platform) => {
    setSelectedPlatforms((prev) => {
      const isSelected = prev.some(
        (p) => p.platform.id === platform.platform.id
      );
      if (isSelected) {
        return prev.filter((p) => p.platform.id !== platform.platform.id);
      } else {
        return [...prev, platform];
      }
    });
  };

  const handleConfirmAddGame = async () => {
    if (!selectedGameForPlatforms || selectedPlatforms.length === 0) return;

    try {
      // Add the game once for each selected platform
      for (const platform of selectedPlatforms) {
        const gameWithPlatform = {
          ...selectedGameForPlatforms,
          selectedPlatform: platform.platform,
          platformSpecific: true,
          isWishlisted: addToWishlist, // Add wishlist flag
        };
        await onGameAdd(gameWithPlatform);
      }

      // Reset platform selection state but keep search results open
      setSelectedGameForPlatforms(null);
      setSelectedPlatforms([]);
      setAddToWishlist(false); // Reset wishlist flag
      // Don't clear search query or results to allow adding more games
    } catch (error) {
      console.error("Error adding game:", error);
    }
  };

  const handleCancelPlatformSelection = () => {
    setSelectedGameForPlatforms(null);
    setSelectedPlatforms([]);
    setAddToWishlist(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    setSelectedGameForPlatforms(null);
    setSelectedPlatforms([]);
    setAddToWishlist(false);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto">
        <div className="relative">
          <div className="flex items-center bg-white rounded-xs border border-gray-300 shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <Search
              className="text-gray-400 ml-3 sm:ml-4 w-5 h-5"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for games to add to your library..."
              className="w-full px-3 sm:px-4 py-2 ml-2 sm:py-3 text-sm sm:text-base text-gray-700 bg-transparent rounded-xs focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600 mr-2"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {/* Barcode scanner removed */}
          </div>

          {isSearching && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b-lg shadow-lg p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-500 mt-2">Searching games...</p>
            </div>
          )}

          {/* Search Results */}
          {showSearchResults &&
            searchResults.length > 0 &&
            !selectedGameForPlatforms && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b-lg shadow-lg max-h-96 overflow-y-auto z-10">
                {searchResults.map((game) => {
                  const isAdded = isGameRecentlyAdded(game.id);
                  return (
                    <div
                      key={game.id}
                      className={`flex items-center p-4 border-b border-gray-100 ${
                        isAdded ? "bg-green-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <GameImage
                        src={game.background_image}
                        alt={game.name}
                        className="w-16 h-16 object-cover rounded"
                        fallbackSrc={psLogo}
                      />
                      <div className="ml-4 flex-1">
                        <div className="flex items-center">
                          <h3 className="font-semibold text-gray-800">
                            {game.name}
                          </h3>
                          {isAdded && (
                            <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                              Added
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {game.released &&
                            `Released: ${new Date(
                              game.released
                            ).getFullYear()}`}
                          {game.genres &&
                            game.genres.length > 0 &&
                            ` • ${game.genres.map((g) => g.name).join(", ")}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {game.platforms
                            ?.slice(0, 3)
                            .map((p) => p.platform.name)
                            .join(", ")}
                          {game.platforms?.length > 3 &&
                            ` +${game.platforms.length - 3} more`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSelectPlatforms(game)}
                        className="ml-4 px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {isAdded ? "Add Again" : "Select Platforms"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

          {/* Platform Selection Modal */}
          {selectedGameForPlatforms && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b-lg shadow-lg z-20">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">
                    Select Platforms for {selectedGameForPlatforms.name}
                  </h3>
                  <button
                    onClick={handleCancelPlatformSelection}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Choose which platforms you own this game on:
                </p>
              </div>

              <div className="p-4 max-h-48 overflow-y-auto">
                {/* Wishlist Option */}
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addToWishlist}
                      onChange={(e) => setAddToWishlist(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 font-medium">
                      Add to wishlist instead of library
                    </span>
                    <svg
                      className="ml-2 w-4 h-4 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Wishlisted games won't appear in your main library until you
                    toggle them off the wishlist.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedGameForPlatforms.platforms?.map((platform) => (
                    <label
                      key={platform.platform.id}
                      className="flex items-center cursor-pointer p-2 rounded hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.some(
                          (p) => p.platform.id === platform.platform.id
                        )}
                        onChange={() => handlePlatformToggle(platform)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {platform.platform.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {selectedPlatforms.length} platform
                  {selectedPlatforms.length !== 1 ? "s" : ""} selected
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancelPlatformSelection}
                    className="px-3 py-1.5 text-gray-600 text-sm rounded hover:bg-gray-100 focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAddGame}
                    disabled={selectedPlatforms.length === 0}
                    className={`px-3 py-1.5 text-sm rounded focus:outline-none ${
                      selectedPlatforms.length > 0
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Add Game{selectedPlatforms.length > 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showSearchResults &&
            searchResults.length === 0 &&
            !isSearching &&
            searchQuery &&
            !selectedGameForPlatforms && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b-lg shadow-lg p-4 text-center">
                <p className="text-gray-500">
                  No games found. Try a different search term.
                </p>
              </div>
            )}
        </div>

        <div className="text-center mt-4 space-y-2">
          <button
            onClick={onToggleManualForm}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium block mx-auto"
          >
            {showManualForm
              ? "Hide manual form"
              : "Can't find your game? Add it manually"}
          </button>
          <div className="flex flex-row align-baseline justify-center items-center gap-2">

          {hasGames && (
            <button
              onClick={onUpdateMissingImages}
              disabled={isUpdatingImages}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                isUpdatingImages
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {isUpdatingImages ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Finding Images...
                </>
              ) : (
                "Find Missing Images"
              )}
            </button>
          )}
          {hasGames && (
            <button
              onClick={onUpdateMissingInformation}
              disabled={isUpdatingImages}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                isUpdatingImages
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
            >
              {isUpdatingImages ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating Info...
                </>
              ) : (
                "Update Missing Info"
              )}
            </button>
          )}
          </div>
        </div>

        {/* Barcode scanner removed */}
      </div>
    </div>
  );
};

export default GameSearch;
