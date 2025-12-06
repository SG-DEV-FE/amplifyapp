import React, { useState, useEffect, useMemo } from "react";
import psLogo from "../ps-logo.svg";

// Shimmer placeholder component
const ShimmerImage = ({ width = "w-full", height = "h-64", className = "" }) => (
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

  if (!src) {
    return (
      <div className="w-full h-64 bg-gray-300 rounded flex items-center justify-center">
        <div className="text-center text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2h12a2 2 0 002 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs">No Image</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && <ShimmerImage className={className} />}
      <img
        src={imgSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0 absolute' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
};

const SharedGameCard = ({ note }) => {
  const handleImageError = (e) => {
    e.target.src = psLogo;
    e.target.onerror = null;
  };

  return (
    <div className="w-full max-w-64 mx-auto py-5">
      <div className="relative">
        <GameImage
          src={note.image}
          alt={note.name}
          className="w-full h-64 object-cover rounded"
          fallbackSrc={psLogo}
        />
        {/* Wishlist Heart Indicator - Non-interactive */}
        {note.isWishlisted && (
          <div className="absolute top-2 right-2 p-2 rounded-full bg-black bg-opacity-75">
            <svg
              className="w-5 h-5 text-red-500"
              fill="currentColor"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
        )}
        {note.selectedPlatform && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {note.selectedPlatform.name}
          </div>
        )}
      </div>

      <h2 className="py-3 text-white text-center">{note.name}</h2>
    </div>
  );
};

const SharedLibrary = ({ shareId }) => {
  const [games, setGames] = useState([]);
  const [ownerName, setOwnerName] = useState("");
  const [shareType, setShareType] = useState("full");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [showWishlist, setShowWishlist] = useState(true);

  // Fetch shared library data
  useEffect(() => {
    const fetchSharedLibrary = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/shared-library?shareId=${shareId}`);
        
        if (!response.ok) {
          throw new Error("Library not found or no longer shared");
        }

        const data = await response.json();
        setGames(data.games || []);
        setOwnerName(data.ownerName || "Anonymous User");
        setShareType(data.shareType || "full");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      fetchSharedLibrary();
    }
  }, [shareId]);

  // Get unique platforms
  const availablePlatforms = useMemo(() => {
    const platforms = games
      .filter((note) => note.selectedPlatform)
      .map((note) => note.selectedPlatform)
      .reduce((acc, platform) => {
        if (!acc.find((p) => p.id === platform.id)) {
          acc.push(platform);
        }
        return acc;
      }, []);

    return platforms.sort((a, b) => a.name.localeCompare(b.name));
  }, [games]);

  // Filter games by platform and wishlist status
  const filteredGames = useMemo(() => {
    let filtered = [...games];
    
    // Filter by wishlist status (only for full library shares)
    if (shareType === "full") {
      if (showWishlist) {
        // Show all games (library + wishlist)
        filtered = games;
      } else {
        // Show only library games (exclude wishlist)
        filtered = games.filter(game => !game.isWishlisted);
      }
    }
    // For wishlist shares, always show all (they're all wishlisted anyway)
    
    // Sort alphabetically
    const sortedGames = filtered.sort((a, b) => a.name.localeCompare(b.name));
    
    // Filter by platform
    if (selectedPlatform === "all") {
      return sortedGames;
    }
    
    return sortedGames.filter(
      (note) =>
        note.selectedPlatform &&
        note.selectedPlatform.id === parseInt(selectedPlatform)
    );
  }, [games, selectedPlatform, showWishlist, shareType]);

  if (loading) {
    return (
      <div className="bg-black min-h-screen">
        <div className="container mx-auto py-16">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Loading Shared Library...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black min-h-screen">
        <div className="container mx-auto py-16">
          <div className="text-center text-white">
            <svg
              className="mx-auto h-16 w-16 text-red-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h3 className="text-lg font-medium mb-2">Library Not Found</h3>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="container justify-center mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">
              {shareType === "wishlist" ? (
                <>❤️ {ownerName}'s Wishlist</>
              ) : (
                <>{ownerName}'s Game Library</>
              )}
            </h1>
            <p className="text-gray-400">
              {shareType === "wishlist" ? (
                <>Shared wishlist • {games.length} games wanted</>
              ) : (
                <>Shared game collection • {
                  showWishlist ? games.length : games.filter(g => !g.isWishlisted).length
                } games {showWishlist ? "" : "(library only)"}</>
              )}
            </p>
            {shareType === "full" && (
              <div className="mt-2 flex justify-center gap-4 text-sm">
                <span className="text-blue-400">
                  📚 {games.filter(g => !g.isWishlisted).length} in library
                </span>
                <span className="text-red-400">
                  ❤️ {games.filter(g => g.isWishlisted).length} wishlisted
                </span>
              </div>
            )}
            <div className="mt-4 text-xs text-gray-500">
              🎮 Read-only view • This is a shared {shareType === "wishlist" ? "wishlist" : "library"}
            </div>
          </div>
        </div>
      </div>

      {/* Wishlist Filter - Only for full library shares */}
      {shareType === "full" && games.some(game => game.isWishlisted) && (
        <div className="w-full bg-black py-4 border-b border-gray-800">
          <div className="container mx-auto flex justify-center px-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showWishlist}
                onChange={(e) => setShowWishlist(e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-white text-sm font-medium">
                Include wishlist items (
                {games.filter((game) => game.isWishlisted).length} games)
              </span>
              <svg
                className="ml-2 w-4 h-4 text-red-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </label>
          </div>
        </div>
      )}

      {/* Platform Filters */}
      {games.length > 0 && availablePlatforms.length > 0 && (
        <div className="w-full bg-black py-6 border-b border-gray-800">
          <div className="container mx-auto flex justify-center content-center flex-col px-4">
            {/* Mobile Dropdown Filter */}
            <div className="block md:hidden">
              <div className="max-w-sm mx-auto">
                <label
                  htmlFor="platform-select"
                  className="block text-white text-sm font-medium mb-2 text-center"
                >
                  Filter by Platform:
                </label>
                <select
                  id="platform-select"
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-xs text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Platforms ({
                    shareType === "full" 
                      ? (showWishlist ? games.length : games.filter(g => !g.isWishlisted).length)
                      : games.length
                  })</option>
                  {availablePlatforms.map((platform) => {
                    const filteredByWishlist = shareType === "full" 
                      ? (showWishlist ? games : games.filter(g => !g.isWishlisted))
                      : games;
                    const count = filteredByWishlist.filter(
                      (note) =>
                        note.selectedPlatform &&
                        note.selectedPlatform.id === platform.id
                    ).length;
                    return (
                      <option key={platform.id} value={platform.id.toString()}>
                        {platform.name} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Desktop Button Filter */}
            <div className="hidden md:flex flex-col items-center">
              <span className="text-white text-sm font-medium mb-3">
                Filter by Platform:
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setSelectedPlatform("all")}
                  className={`px-4 py-2 text-sm rounded-full transition-colors cursor-pointer ${
                    selectedPlatform === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  All Platforms ({
                    shareType === "full" 
                      ? (showWishlist ? games.length : games.filter(g => !g.isWishlisted).length)
                      : games.length
                  })
                </button>
                {availablePlatforms.map((platform) => {
                  const filteredByWishlist = shareType === "full" 
                    ? (showWishlist ? games : games.filter(g => !g.isWishlisted))
                    : games;
                  const count = filteredByWishlist.filter(
                    (note) =>
                      note.selectedPlatform &&
                      note.selectedPlatform.id === platform.id
                  ).length;
                  return (
                    <button
                      key={platform.id}
                      onClick={() =>
                        setSelectedPlatform(platform.id.toString())
                      }
                      className={`px-4 py-2 text-sm rounded-full transition-colors cursor-pointer ${
                        selectedPlatform === platform.id.toString()
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {platform.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Games Grid */}
      <div className="container mx-auto px-4 py-8">
        {filteredGames.length === 0 ? (
          <div className="text-center text-white py-16">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="text-lg font-medium mb-2">No Games Found</h3>
            <p className="text-gray-400">
              No games found for the selected platform filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
            {filteredGames.map((note) => (
              <SharedGameCard
                key={`${note.id || note.name}-${
                  note.selectedPlatform?.id || "default"
                }`}
                note={note}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedLibrary;