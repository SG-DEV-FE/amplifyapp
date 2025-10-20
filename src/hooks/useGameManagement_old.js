import { useState, useCallback } from 'react';
import { supabase } from '../index';

const RAWG_API_KEY = process.env.REACT_APP_RAWG_API_KEY || '';
const RAWG_BASE_URL = 'https://api.rawg.io/api';

export const useGameManagement = (userId) => {
  const [notes, setNotes] = useState([]);
  const [isUpdatingImages, setIsUpdatingImages] = useState(false);

  // Fetch user's personal library
  const fetchNotes = useCallback(async () => {
    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
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
  }, [userId]);

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
        image: '', 
        user_id: userId
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
      alert(`"${game.name}" added to your library!`);
      
    } catch (error) {
      console.error('Error adding game from search:', error);
      alert('Failed to add game. Please try the manual form.');
    }
  };

  // Create a game (manual form)
  const createNote = async (formData) => {
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
          user_id: userId
        }
      ]);
      
    if (error) {
      console.error('Error creating note:', error);
      return;
    }
    
    await fetchNotes();
  };

  // Delete function - removes a game
  const deleteNote = async (noteToDelete) => {
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

    // Also delete the image from storage if it exists and it's a Supabase file
    if (noteToDelete.image && !noteToDelete.image.startsWith('http')) {
      const fileName = noteToDelete.image.includes('/') 
        ? noteToDelete.image.split('/').pop() 
        : noteToDelete.image;
        
      await supabase.storage
        .from('images')
        .remove([fileName]);
    }

    await fetchNotes();
  };

  // Edit function - updates an existing game
  const updateNote = async (formData, editingNote, newImageUploaded) => {
    if (!formData.name || !formData.description) return;

    console.log('Updating note with data:', formData);
    console.log('New image uploaded:', newImageUploaded);
    console.log('Original note image:', editingNote.image);

    // If a new image was uploaded, delete the old one (only if it's a Supabase file)
    if (newImageUploaded && editingNote.image && !editingNote.image.startsWith('http')) {
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
  };

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

  return {
    notes,
    isUpdatingImages,
    fetchNotes,
    addGameFromSearch,
    createNote,
    deleteNote,
    updateNote,
    updateMissingImages
  };
};