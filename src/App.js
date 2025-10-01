import { useEffect, useState, useCallback } from 'react';
import './App.css';
import '@aws-amplify/ui-react/styles.css';
import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlusSquare, faChevronDown, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Modal from 'react-modal';
import psLogo from './ps-logo.svg'
import { supabase } from './index';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';

library.add(faPlusSquare, faChevronDown, faSearch, faTimes)

const initialFormState = { 
  name: '', 
  description: '',
  genre: '',
  releaseDate: '',
  players: '',
  publisher: '',
  image: '',
}

// RAWG API configuration
const RAWG_API_KEY = process.env.REACT_APP_RAWG_API_KEY || ''; // Add your API key to .env
const RAWG_BASE_URL = 'https://api.rawg.io/api';

// Main Game Library Component
function GameLibrary() {
  const { user, isAdmin, signOut } = useAuth();
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [modalIsOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newImageUploaded, setNewImageUploaded] = useState(false);
  
  // Search functionality state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [isUpdatingImages, setIsUpdatingImages] = useState(false);

  //  fetch user's personal library
  const fetchNotes = useCallback(async () => {
    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }
    
    // Handle image URLs - check if it's a URL or a Supabase storage filename
    const notesWithImages = notes.map((note) => {
      console.log('🔍 Processing note:', {
        id: note.id,
        name: note.name,
        originalImage: note.image
      });
      
      if (note.image) {
        // If it's already a full URL (from RAWG), use it directly
        if (note.image.startsWith('http://') || note.image.startsWith('https://')) {
          console.log('📷 Using direct URL for:', note.name, note.image);
          return { ...note, image: note.image };
        }
        // If it's a filename, get the public URL from Supabase storage
        else {
          const { data } = supabase.storage.from('images').getPublicUrl(note.image);
          console.log('📁 Using Supabase storage for:', note.name, data.publicUrl);
          return { ...note, image: data.publicUrl };
        }
      }
      console.log('❌ No image for:', note.name);
      return note;
    });
    
    setNotes(notesWithImages);
  }, [user.id]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

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

  // Find and update missing images for existing games
  const updateMissingImages = async () => {
    if (isUpdatingImages) return;
    
    setIsUpdatingImages(true);
    
    try {
      // Find games without images
      const gamesWithoutImages = notes.filter(note => !note.image || note.image === '');
      
      if (gamesWithoutImages.length === 0) {
        alert('All games already have images!');
        setIsUpdatingImages(false);
        return;
      }
      
      console.log(`🔍 Found ${gamesWithoutImages.length} games without images:`, gamesWithoutImages.map(g => g.name));
      
      let updatedCount = 0;
      
      for (const game of gamesWithoutImages) {
        try {
          console.log(`🎮 Searching for image for: ${game.name}`);
          
          // Search RAWG for this game
          const response = await fetch(
            `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(game.name)}&page_size=5`
          );
          
          if (!response.ok) {
            console.log(`❌ Failed to search for ${game.name}`);
            continue;
          }
          
          const data = await response.json();
          const searchResults = data.results || [];
          
          // Find the best match (exact name match or first result)
          let bestMatch = searchResults.find(result => 
            result.name.toLowerCase() === game.name.toLowerCase()
          );
          
          if (!bestMatch && searchResults.length > 0) {
            bestMatch = searchResults[0];
          }
          
          if (bestMatch && bestMatch.background_image) {
            console.log(`📷 Found image for ${game.name}:`, bestMatch.background_image);
            
            // Update the game with the new image
            const { error } = await supabase
              .from('notes')
              .update({ image: bestMatch.background_image })
              .eq('id', game.id);
              
            if (error) {
              console.error(`❌ Failed to update ${game.name}:`, error);
            } else {
              console.log(`✅ Updated image for ${game.name}`);
              updatedCount++;
            }
          } else {
            console.log(`❌ No image found for ${game.name}`);
          }
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Error processing ${game.name}:`, error);
        }
      }
      
      if (updatedCount > 0) {
        alert(`Successfully updated images for ${updatedCount} games!`);
        await fetchNotes(); // Refresh the games list
      } else {
        alert('No images could be found for the games missing images.');
      }
      
    } catch (error) {
      console.error('Error updating missing images:', error);
      alert('Failed to update missing images. Please try again.');
    } finally {
      setIsUpdatingImages(false);
    }
  };

  // Add game from search results
  const addGameFromSearch = async (game) => {
    try {
      // Format the game data from RAWG API
      const gameData = {
        name: game.name,
        description: game.platforms?.map(p => p.platform.name).join(', ') || 'Multiple Platforms',
        genre: game.genres?.map(g => g.name).join(', ') || '',
        release_date: game.released || '',
        players: game.tags?.find(tag => tag.name.includes('Multiplayer')) ? 2 : 1,
        publisher: game.publishers?.[0]?.name || 'Unknown',
        image: '', // We'll handle image separately
        user_id: user.id
      };

      // Store the RAWG image URL directly - no need to download and re-upload
      if (game.background_image) {
        gameData.image = game.background_image;
        console.log('🎮 RAWG Game Data:', {
          name: game.name,
          imageUrl: game.background_image,
          gameData: gameData
        });
      }

      const { data: insertedData, error } = await supabase
        .from('notes')
        .insert([gameData])
        .select();
        
      if (error) {
        console.error('Error adding game:', error);
        alert(`Error adding game: ${error.message}`);
        return;
      }
      
      console.log('✅ Game inserted successfully:', insertedData);
      
      await fetchNotes();
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      alert(`"${game.name}" added to your library!`);
      
    } catch (error) {
      console.error('Error adding game from search:', error);
      alert('Failed to add game. Please try the manual form.');
    }
  };

  // Create a tile function (manual form)
  async function createNote() {
    if (!formData.name || !formData.description) return;
  
    const { error } = await supabase
      .from('notes')
      .insert([
        {
          name: formData.name,
          description: formData.description,
          genre: formData.genre,
          release_date: formData.releaseDate,
          players: parseInt(formData.players) || null,
          publisher: formData.publisher,
          image: formData.image,
          user_id: user.id
        }
      ]);
      
    if (error) {
      console.error('Error creating note:', error);
      return;
    }
    
    await fetchNotes();
    setFormData(initialFormState);
    setShowManualForm(false);
  }

  // Delete function - removes a tile
  async function deleteNote(noteToDelete) {
    if (!window.confirm(`Are you sure you want to delete "${noteToDelete.name}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteToDelete.id);
      
    if (error) {
      console.error('Error deleting note:', error);
      return;
    }

    // Also delete the image from storage if it exists
    if (noteToDelete.image) {
      const fileName = noteToDelete.image.includes('/') 
        ? noteToDelete.image.split('/').pop() 
        : noteToDelete.image;
        
      await supabase.storage
        .from('images')
        .remove([fileName]);
    }

    await fetchNotes();
  }

  // Edit function - updates an existing tile
  async function updateNote() {
    if (!formData.name || !formData.description) return;

    console.log('Updating note with data:', formData);
    console.log('New image uploaded:', newImageUploaded);
    console.log('Original note image:', editingNote.image);

    // If a new image was uploaded, delete the old one
    if (newImageUploaded && editingNote.image) {
      const oldFileName = editingNote.image.includes('/') 
        ? editingNote.image.split('/').pop() 
        : editingNote.image;
        
      console.log('Deleting old image:', oldFileName);
      await supabase.storage
        .from('images')
        .remove([oldFileName]);
    }

    const { error } = await supabase
      .from('notes')
      .update({
        name: formData.name,
        description: formData.description,
        genre: formData.genre,
        release_date: formData.releaseDate,
        players: parseInt(formData.players) || null,
        publisher: formData.publisher,
        image: formData.image
      })
      .eq('id', editingNote.id);
      
    if (error) {
      console.error('Error updating note:', error);
      alert(`Update error: ${error.message}`);
      return;
    }
    
    console.log('Note updated successfully');
    await fetchNotes();
    setFormData(initialFormState);
    setEditingNote(null);
    setEditMode(false);
    setNewImageUploaded(false);
    setShowManualForm(false);
  }

  // Start editing a note
  function startEdit(note) {
    setEditingNote(note);
    setEditMode(true);
    setShowManualForm(true);
    setNewImageUploaded(false);
    // Extract just the filename from the full URL for editing
    const imageFileName = note.image && note.image.includes('/') 
      ? note.image.split('/').pop() 
      : note.image;
      
    setFormData({
      name: note.name,
      description: note.description,
      genre: note.genre || '',
      releaseDate: note.release_date || '',
      players: note.players || '',
      publisher: note.publisher || '',
      image: imageFileName || ''
    });
    
    // Scroll to form
    document.getElementById('game-form').scrollIntoView({ behavior: 'smooth' });
  }

  // Cancel editing
  function cancelEdit() {
    setEditingNote(null);
    setEditMode(false);
    setNewImageUploaded(false);
    setFormData(initialFormState);
    setShowManualForm(false);
  }

  // Image upload function
  async function onChange(e) {
    if (!e.target.files[0]) return;
  
    const file = e.target.files[0];
    
    // Sanitize filename by removing special characters and spaces
    const sanitizedName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_');
    
    const fileName = `${Date.now()}-${sanitizedName}`;
    
    console.log('Original filename:', file.name);
    console.log('Sanitized filename:', fileName, 'in edit mode:', editMode);
    
    const { error } = await supabase.storage
      .from('images')
      .upload(fileName, file);
      
    if (error) {
      console.error('Error uploading file:', error);
      alert(`Upload error: ${error.message}`);
      return;
    }
    
    console.log('File uploaded successfully:', fileName);
    setFormData({ ...formData, image: fileName });
    if (editMode) {
      setNewImageUploaded(true);
      console.log('New image uploaded during edit');
    }
  }

  // Modal function
  function openModal() {
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
    },
  };

  function noImage(ev) {
    ev.target.src = psLogo;
    ev.target.onerror = null;
  }

  return (
    <>
      {/* Navigation */}
      <nav className="bg-white-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-5">
              <div className="flex-shrink-0">
                <a className="h-8 w-8" href="https://www.playstation.com" aria-label="PlayStation.com">
                  <svg className="shared-nav-ps-logo" width="50px" height="50px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
                    <g>
                      <g>
                        <path d="M5.8,32.1C4.3,33.1,4.8,35,8,35.9c3.3,1.1,6.9,1.4,10.4,0.8c0.2,0,0.4-0.1,0.5-0.1v-3.4l-3.4,1.1
                    c-1.3,0.4-2.6,0.5-3.9,0.2c-1-0.3-0.8-0.9,0.4-1.4l6.9-2.4V27l-9.6,3.3C8.1,30.7,6.9,31.3,5.8,32.1z M29,17.1v9.7
                    c4.1,2,7.3,0,7.3-5.2c0-5.3-1.9-7.7-7.4-9.6C26,11,23,10.1,20,9.5v28.9l7,2.1V16.2c0-1.1,0-1.9,0.8-1.6C28.9,14.9,29,16,29,17.1z
                      M42,29.8c-2.9-1-6-1.4-9-1.1c-1.6,0.1-3.1,0.5-4.5,1l-0.3,0.1v3.9l6.5-2.4c1.3-0.4,2.6-0.5,3.9-0.2c1,0.3,0.8,0.9-0.4,1.4
                    l-10,3.7V40L42,34.9c1-0.4,1.9-0.9,2.7-1.7C45.4,32.2,45.1,30.8,42,29.8z" fill="#0070d1"></path>
                      </g>
                    </g>
                  </svg>
                </a>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2">
              <div className="text-sm text-gray-600 mr-4">
                Welcome, {user?.email} {isAdmin && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs ml-2">Admin</span>}
              </div>
              
              <button
                onClick={signOut}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm"
              >
                Sign Out
              </button>
            </div>
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={signOut}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className='App'>
          {/* main intro */}
          <div className='container flex justify-center align-center flex-col py-8 mx-auto'>
            <h1 className='text-2xl text-slate-800'>Welcome to your personal game library</h1>
            <p className='text-blue-500 uppercase tracking-widest'>play has no limits</p>

            <p className='pt-8'>
              Create and manage your personal game collection here.
              <br />
              Add games you own, want to play, or have completed!
            </p>
          </div>

          {/* Game Search Section */}
          <div className='container mx-auto py-8'>
            <div className='max-w-2xl mx-auto'>
              <div className='relative'>
                <div className='flex items-center bg-white rounded-lg border border-gray-300 shadow-sm'>
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
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowSearchResults(false);
                      }}
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
                          onClick={() => addGameFromSearch(game)}
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
                  onClick={() => setShowManualForm(!showManualForm)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium block mx-auto"
                >
                  {showManualForm ? 'Hide manual form' : "Can't find your game? Add it manually"}
                </button>
                
                {notes.length > 0 && (
                  <button
                    onClick={updateMissingImages}
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

          {/* Game Library Display */}
          <div className="bg-black">
            <div className="container mx-auto">        
              <div className="bg-black grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:content-start md:justify-start">
                {notes.map(note => {
                  console.log('🖼️ Rendering note:', {
                    name: note.name,
                    imageUrl: note.image,
                    hasImage: !!note.image
                  });
                  
                  return (
                    <div key={note.id || note.name} className="w-screen md:w-64 rounded mx-auto py-5">
                      {note.image ? (
                        <img 
                          src={note.image} 
                          alt={note.name} 
                          className='w-screen md:w-64 h-64 object-cover rounded'
                          onLoad={() => console.log('✅ Image loaded successfully for:', note.name)}
                          onError={(e) => {
                            console.log('❌ Image failed to load for:', note.name, 'URL:', note.image);
                            noImage(e);
                          }}
                        />
                      ) : (
                        <div className="w-screen md:w-64 h-64 bg-gray-300 rounded flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-xs">No Image</p>
                          </div>
                        </div>
                      )}
                    <h2 className='py-3 text-white'>{note.name}</h2>
                    <div className="flex flex-wrap justify-center gap-2">
                      <button 
                        type="button" 
                        className="px-4 py-2 bg-blue-500 text-white rounded-full shadow-sm hover:bg-blue-300 focus:ring-2 focus:ring-300"                  
                        onClick={() => {
                          openModal();
                          setModalData(note);
                        }}
                      >
                        View Info
                      </button>
                      <button 
                        type="button" 
                        className="px-4 py-2 bg-green-500 text-white rounded-full shadow-sm hover:bg-green-300 focus:ring-2 focus:ring-300"                  
                        onClick={() => startEdit(note)}
                      >
                        Edit
                      </button>
                        <button 
                          type="button" 
                          className="px-4 py-2 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-300 focus:ring-2 focus:ring-300"                  
                          onClick={() => deleteNote(note)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>          
        
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          style={customStyles}
          contentLabel="Game Information"
        >             
          <div className="py-4 px-4 bg-white">
            <h2 className="text-lg font-semibold text-slate-800">{modalData.name}</h2>
            <p className="mt-4 font-semibold text-slate-800">Supported Platform: <span className="font-thin text-slate">{modalData.description}</span></p>
            <p className="mt-2 font-semibold text-slate-600">Genre: <span className="font-thin text-slate-400">{modalData.genre}</span></p>
            <p className="mt-2 font-semibold text-slate-600">Release Date: <span className="font-thin text-slate-400">{modalData.releaseDate && new Date(modalData.releaseDate).toLocaleDateString()}</span></p>
            <p className="mt-2 font-semibold text-slate-600">Number of players: <span className="font-thin text-slate-400">{modalData.players}</span></p>
            <p className="mt-2 font-semibold text-slate-600">Publisher: <span className="font-thin text-slate-400">{modalData.publisher}</span></p>
          </div>                                    

          <div className="flex justify-end pt-2">          
            <button onClick={closeModal} className="modal-close px-4 bg-blue-500 p-3 rounded-lg text-white hover:bg-blue-400">Close</button>
          </div>
        </Modal>

        {/* Manual Form (now conditional) */}
        {showManualForm && (
          <>
            <div className='container mx-auto py-12'>
              <p className='text-center'>
                <FontAwesomeIcon className='text-blue-500' icon="plus-square"/> 
                {editMode ? ' Edit your game using the form below' : ' Add a game manually using the form below'}
              </p>
            </div>
            <div className='flex justify-center items-center mx-auto py-8'>
              <div id="game-form" className="md:grid md:grid-cols-12 md:gap-6 w-full md:w-2/4 drop-shadow-lg">
                <div className="mt-5 md:mt-0 md:col-span-12">          
                  <div className="shadow sm:rounded-md sm:overflow-hidden">
                    <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                      <div className="grid grid-cols-12 gap-6">

                        {/* Game Title */}
                        <div className="col-span-6">
                          <label htmlFor="title-name" className="block text-sm text-left font-medium text-gray-700 py-4">
                            Game / Title name
                          </label>
                          <div className="mt-1 flex rounded-md shadow-sm">
                            <input 
                              type="text"
                              onChange={e => setFormData({ ...formData, 'name': e.target.value })}
                              placeholder='Title Name'
                              value={formData.name}
                              name="title-name"
                              id="title-name"
                              className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                            />
                          </div>
                        </div>

                        {/* System Platform */}
                        <div className="col-span-6">
                          <label htmlFor="system-platform" className="block text-sm text-left font-medium text-gray-700 py-4">
                            System / Platform
                          </label>
                          <div className="mt-1 flex rounded-md shadow-sm">
                            <input 
                              type="text"
                              onChange={e => setFormData({...formData, 'description': e.target.value})}
                              placeholder='System Platform'
                              value={formData.description}
                              name="system-platform"
                              id="system-platform"
                              className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                            />
                          </div>
                        </div>
                        
                        {/* Title Genre */}
                        <div className="col-span-6">
                          <label htmlFor="title-genre" className="block text-sm text-left font-medium text-gray-700 py-4">
                            Title Genre
                          </label>
                          <div className="mt-1 flex rounded-md shadow-sm">
                            <input 
                              type="text"
                              onChange={e => setFormData({...formData, 'genre': e.target.value})}
                              placeholder='Title Genre'
                              value={formData.genre}
                              name="title-genre"
                              id="title-genre"
                              className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                            />
                          </div>
                        </div>
                                                      
                        {/* Release Date */}
                        <div className="col-span-6">
                          <label htmlFor="release-date" className="block text-sm text-left font-medium text-gray-700 py-4">
                            Release Date
                          </label>
                          <div className="mt-1 flex rounded-md shadow-sm">
                            <input 
                              type="date" 
                              onChange={e => setFormData({...formData, 'releaseDate': e.target.value})}
                              placeholder='Release Date'
                              value={formData.releaseDate}
                              name="release-date"
                              id="release-date"
                              className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2 cursor-pointer"
                            />
                          </div>
                        </div>
                                                      
                        {/* Number of Players */}
                        <div className="col-span-6">
                          <label htmlFor="player-count" className="block text-sm text-left font-medium text-gray-700 py-4">
                            Number of Players
                          </label>
                          <div className="mt-1 flex rounded-md shadow-sm">
                            <input 
                              type="number"
                              onChange={e => setFormData({...formData, 'players': e.target.value})}
                              placeholder='No. of players'
                              value={formData.players}
                              name="player-count"
                              id="player-count"
                              className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                            />
                          </div>
                        </div>
                                                                                          
                        {/* Publisher */}
                        <div className="col-span-6">
                          <label htmlFor="publisher" className="block text-sm text-left font-medium text-gray-700 py-4">
                            Publisher
                          </label>
                          <div className="mt-1 flex rounded-md shadow-sm">
                            <input 
                              type="text"
                              onChange={e => setFormData({...formData, 'publisher': e.target.value})}
                              placeholder='Publisher'
                              value={formData.publisher}
                              name="publisher"
                              id="publisher"
                              className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                            />
                          </div>
                        </div>

                        {/* Image upload */}
                        <div className='col-span-12'>
                          <label htmlFor="file-upload" className="block text-sm text-left font-medium text-gray-700 py-4">
                            Game / Title box art
                          </label>
                          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-left">
                              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <div className="flex justify-center text-sm text-gray-600">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                  <span>Upload a file</span>
                                  <input
                                    type="file"
                                    onChange={onChange}
                                    id="file-upload" 
                                    name="file-upload" 
                                    className="sr-only" 
                                  />
                                </label>
                              </div>
                              <p className="text-xs text-gray-500">
                                PNG, JPG, GIF up to 10MB
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 space-x-2">
                      {editMode ? (
                        <>
                          <button 
                            onClick={updateNote} 
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Update Game
                          </button>
                          <button 
                            onClick={cancelEdit} 
                            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={createNote} 
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Create Game
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      </main>
    </>
  );
}

// Main App Component with Authentication
export default function App() {
  const { user, loading } = useAuth();
  
  // Show login screen if not authenticated
  if (!user && !loading) {
    return <Login />;
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Show the game library for authenticated users
  return <GameLibrary />;
}