import React, { useState, useMemo } from "react";
import psLogo from "../ps-logo.svg";

const GameCard = ({ note, onViewInfo, onEdit, onDelete, isDeletingGame }) => {
  console.log("🖼️ Rendering note:", {
    name: note.name,
    imageUrl: note.image,
    hasImage: !!note.image,
  });

  const handleImageError = (e) => {
    console.log("❌ Image failed to load for:", note.name, "URL:", note.image);
    e.target.src = psLogo;
    e.target.onerror = null;
  };

  const handleImageLoad = () => {
    console.log("✅ Image loaded successfully for:", note.name);
  };

  return (
    <div className="w-screen md:w-64 rounded mx-auto py-5">
      <div className="relative">
        {note.image ? (
          <img
            src={note.image}
            alt={note.name}
            className="w-screen md:w-64 h-64 object-cover rounded"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="w-screen md:w-64 h-64 bg-gray-300 rounded flex items-center justify-center">
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
  isDeletingGame = false,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState("all");

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

  // Filter and sort games based on selected platform
  const filteredNotes = useMemo(() => {
    // Sort notes alphabetically by name
    const sortedNotes = [...notes].sort((a, b) => a.name.localeCompare(b.name));

    if (selectedPlatform === "all") {
      return sortedNotes;
    }
    return sortedNotes.filter(
      (note) =>
        note.selectedPlatform &&
        note.selectedPlatform.id === parseInt(selectedPlatform)
    );
  }, [notes, selectedPlatform]);
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
      <div className="container mx-auto">
        {/* Platform Filter - Show if we have games and at least one has a selectedPlatform */}
        {notes.length > 0 && availablePlatforms.length > 0 && (
          <div className="px-4 py-6">
            {/* Mobile Dropdown Filter */}
            <div className="block md:hidden mb-4">
              <label
                htmlFor="platform-select"
                className="block text-white text-sm font-medium mb-2"
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

            {/* Desktop Button Filter */}
            <div className="hidden md:flex flex-wrap items-center justify-center gap-2">
              <span className="text-white text-sm font-medium mr-3">
                Filter by Platform:
              </span>
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
                    onClick={() => setSelectedPlatform(platform.id.toString())}
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
        )}

        {/* Games Grid */}
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
          <div className="bg-black grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:content-start md:justify-start">
            {filteredNotes.map((note) => (
              <GameCard
                key={`${note.id || note.name}-${
                  note.selectedPlatform?.id || "default"
                }`}
                note={note}
                onViewInfo={onViewInfo}
                onEdit={onEdit}
                onDelete={onDelete}
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
