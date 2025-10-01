import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import psLogo from '../ps-logo.svg';

const RAWG_API_KEY = process.env.REACT_APP_RAWG_API_KEY || '';
const RAWG_BASE_URL = 'https://api.rawg.io/api';

const GameSearch = ({ onGameAdd, onToggleManualForm, showManualForm, onUpdateMissingImages, hasGames, isUpdatingImages }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

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
        `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=10`
      );
      
      if (!response.ok) throw new Error('Failed to fetch games');
      
      const data = await response.json();
      setSearchResults(data.results || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching games:', error);
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
  const handleAddGame = async (game) => {
    try {
      await onGameAdd(game);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
    } catch (error) {
      console.error('Error adding game:', error);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  return (
    <div className='container mx-auto py-8'>
      <div className='max-w-2xl mx-auto'>
        <div className='relative'>
          <div className='flex sm:mx-2 items-center bg-white rounded-lg border border-gray-300 shadow-sm'>
            <FontAwesomeIcon 
              icon="search" 
              className='text-gray-400 ml-4'
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for games to add to your library..."
              className="w-full px-4 py-3 text-gray-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600 mr-4"
              >
                <FontAwesomeIcon icon="times" />
              </button>
            )}
          </div>
          
          {isSearching && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b-lg shadow-lg p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-500 mt-2">Searching games...</p>
            </div>
          )}

          {/* Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b-lg shadow-lg max-h-96 overflow-y-auto z-10">
              {searchResults.map((game) => (
                <div key={game.id} className="flex items-center p-4 hover:bg-gray-50 border-b border-gray-100">
                  <img 
                    src={game.background_image || psLogo} 
                    alt={game.name}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => { e.target.src = psLogo; }}
                  />
                  <div className="ml-4 flex-1">
                    <h3 className="font-semibold text-gray-800">{game.name}</h3>
                    <p className="text-sm text-gray-600">
                      {game.released && `Released: ${new Date(game.released).getFullYear()}`}
                      {game.genres && game.genres.length > 0 && ` • ${game.genres.map(g => g.name).join(', ')}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {game.platforms?.slice(0, 3).map(p => p.platform.name).join(', ')}
                      {game.platforms?.length > 3 && ` +${game.platforms.length - 3} more`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddGame(game)}
                    className="ml-4 px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Add to Library
                  </button>
                </div>
              ))}
            </div>
          )}

          {showSearchResults && searchResults.length === 0 && !isSearching && searchQuery && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b-lg shadow-lg p-4 text-center">
              <p className="text-gray-500">No games found. Try a different search term.</p>
            </div>
          )}
        </div>
        
        <div className="text-center mt-4 space-y-2">
          <button
            onClick={onToggleManualForm}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium block mx-auto"
          >
            {showManualForm ? 'Hide manual form' : "Can't find your game? Add it manually"}
          </button>
          
          {hasGames && (
            <button
              onClick={onUpdateMissingImages}
              disabled={isUpdatingImages}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                isUpdatingImages
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isUpdatingImages ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Finding Images...
                </>
              ) : (
                'Find Missing Images'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameSearch;