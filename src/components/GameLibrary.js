import React, { useState, useMemo } from "react";
import psLogo from "../ps-logo.svg";

const GameCard = ({
  note,
  onViewInfo,
  onEdit,
  onDelete,
  onToggleWishlist,
  isDeletingGame,
}) => {
  const handleImageError = (e) => {
    e.target.src = psLogo;
    e.target.onerror = null;
  };

  const handleImageLoad = () => {
    // Image loaded successfully
  };

  return (
    <div className="w-full max-w-64 mx-auto py-5">
      <div className="relative">
        {note.image ? (
          <img
            src={note.image}
            alt={note.name}
            className="w-full h-64 object-cover rounded"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-xs">No Image</p>
            </div>
          </div>
        )}
        {/* Wishlist Heart Icon */}
        <button
          onClick={() => onToggleWishlist(note)}
          className="absolute top-2 right-2 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 transition-all duration-200"
          title={note.isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <svg
            className={`w-5 h-5 ${
              note.isWishlisted ? "text-red-500" : "text-white"
            }`}
            fill={note.isWishlisted ? "currentColor" : "none"}
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
        </button>
        {note.selectedPlatform && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {note.selectedPlatform.name}
          </div>
        )}
      </div>

      <h2 className="py-3 text-white">{note.name}</h2>

      {/* Platform badge */}
      {note.selectedPlatform && (
        <div className="mb-3 flex justify-center">
          <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
            {note.selectedPlatform.name}
          </span>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="px-4 py-2 bg-blue-500 text-white rounded-full shadow-sm hover:bg-blue-300 focus:ring-2 focus:ring-300"
          onClick={() => onViewInfo(note)}
        >
          View Info
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-green-500 text-white rounded-full shadow-sm hover:bg-green-300 focus:ring-2 focus:ring-300"
          onClick={() => onEdit(note)}
        >
          Edit
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-white rounded-full shadow-sm focus:ring-2 focus:ring-300 ${
            isDeletingGame
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-300"
          }`}
          onClick={() => onDelete(note)}
          disabled={isDeletingGame}
        >
          {isDeletingGame ? (
            <>
              <div className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
              Deleting...
            </>
          ) : (
            "Delete"
          )}
        </button>
      </div>
    </div>
  );
};

const GameLibrary = ({
  notes,
  onViewInfo,
  onEdit,
  onDelete,
  onToggleWishlist,
  isDeletingGame = false,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);

  // Get unique platforms from all games
  const availablePlatforms = useMemo(() => {
    const platforms = notes
      .filter((note) => note.selectedPlatform)
      .map((note) => note.selectedPlatform)
      .reduce((acc, platform) => {
        if (!acc.find((p) => p.id === platform.id)) {
          acc.push(platform);
        }
        return acc;
      }, []);

    return platforms.sort((a, b) => a.name.localeCompare(b.name));
  }, [notes]);

  // Filter and sort games based on selected platform and wishlist
  const filteredNotes = useMemo(() => {
    // Sort notes alphabetically by name
    const sortedNotes = [...notes].sort((a, b) => a.name.localeCompare(b.name));

    // Apply wishlist filter first
    let filtered = sortedNotes;
    if (showWishlistOnly) {
      filtered = filtered.filter((note) => note.isWishlisted);
    }

    // Then apply platform filter
    if (selectedPlatform === "all") {
      return filtered;
    }
    return filtered.filter(
      (note) =>
        note.selectedPlatform &&
        note.selectedPlatform.id === parseInt(selectedPlatform)
    );
  }, [notes, selectedPlatform, showWishlistOnly]);
  if (notes.length === 0) {
    return (
      <div className="bg-black">
        <div className="container mx-auto py-16">
          <div className="text-center text-white">
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="text-lg font-medium mb-2">No Games Yet</h3>
            <p className="text-gray-400">
              Search for games above to start building your library!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black">
      {/* Filters Section - Always at top and centered */}
      {notes.length > 0 && availablePlatforms.length > 0 && (
        <div className="w-full bg-black py-6 border-b border-gray-800">
          <div className="container mx-auto flex justify-center content-center flex-col px-4">
            {/* Wishlist Filter - Centered */}
            <div className="flex justify-center mb-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWishlistOnly}
                  onChange={(e) => setShowWishlistOnly(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="ml-2 text-white text-sm font-medium">
                  Show wishlist only (
                  {notes.filter((note) => note.isWishlisted).length} games)
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

            {/* Mobile Dropdown Filter - Centered */}
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
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Platforms ({notes.length})</option>
                  {availablePlatforms.map((platform) => {
                    const count = notes.filter(
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

            {/* Desktop Button Filter - Centered */}
            <div className="hidden md:flex flex-col items-center">
              <span className="text-white text-sm font-medium mb-3">
                Filter by Platform:
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setSelectedPlatform("all")}
                  className={`px-4 py-2 text-sm rounded-full transition-colors ${
                    selectedPlatform === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  All Platforms ({notes.length})
                </button>
                {availablePlatforms.map((platform) => {
                  const count = notes.filter(
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
                      className={`px-4 py-2 text-sm rounded-full transition-colors ${
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

      {/* Games Grid Section */}
      <div className="container mx-auto px-4 py-8">
        {filteredNotes.length === 0 ? (
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
            {filteredNotes.map((note) => (
              <GameCard
                key={`${note.id || note.name}-${
                  note.selectedPlatform?.id || "default"
                }`}
                note={note}
                onViewInfo={onViewInfo}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleWishlist={onToggleWishlist}
                isDeletingGame={isDeletingGame}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameLibrary;
