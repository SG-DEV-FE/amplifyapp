import { useState, useCallback } from "react";

const RAWG_API_KEY = process.env.REACT_APP_RAWG_API_KEY || "";
const RAWG_BASE_URL = "https://api.rawg.io/api";

// Helper function to make authenticated requests to Netlify Functions
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem("netlifyToken");
  const userId = localStorage.getItem("userId");

  const headers = {
    "Content-Type": "application/json",
    "x-user-id": userId,
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Request failed");
  }

  return response.json();
};

export const useGameManagement = (
  userId,
  onShowToast,
  onShowHeartNotification
) => {
  const [notes, setNotes] = useState([]);
  const [isUpdatingImages, setIsUpdatingImages] = useState(false);
  const [isDeletingGame, setIsDeletingGame] = useState(false);

  // Fetch user's personal library
  const fetchNotes = useCallback(async () => {
    try {
      const games = await fetchWithAuth("/api/games");

      // Handle image URLs - check if it's a URL or a Netlify image
      const notesWithImages = games.map((note) => {
        if (note.image) {
          // If it's already a full URL (from RAWG), use it directly
          if (
            note.image.startsWith("http://") ||
            note.image.startsWith("https://")
          ) {
            return { ...note, image: note.image };
          }
          // If it's a filename, get the URL from Netlify
          else {
            const imageUrl = `/api/images?file=${encodeURIComponent(
              note.image
            )}`;
            return { ...note, image: imageUrl };
          }
        }
        return note;
      });

      setNotes(notesWithImages);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  }, []);

  // Add game from search results
  const addGameFromSearch = async (game) => {
    try {
      // Format the game data from RAWG API
      const gameData = {
        name: game.name,
        // If a specific platform was selected, use it; otherwise use all platforms
        description: game.selectedPlatform
          ? game.selectedPlatform.name
          : game.platforms?.map((p) => p.platform.name).join(", ") ||
            "Multiple Platforms",
        genre: game.genres?.map((g) => g.name).join(", ") || "",
        release_date: game.released || "",
        players: game.tags?.find((tag) => tag.name.includes("Multiplayer"))
          ? 2
          : 1,
        publisher: game.publishers?.[0]?.name || "Unknown",
        image: "",
        // Store the selected platform information
        selectedPlatform: game.selectedPlatform || null,
        rawgId: game.id, // Store original RAWG ID
        isWishlisted: game.isWishlisted || false, // Add wishlist status
      };

      // Store the RAWG image URL directly
      if (game.background_image) {
        gameData.image = game.background_image;
      }

      const insertedGame = await fetchWithAuth("/api/games", {
        method: "POST",
        body: JSON.stringify(gameData),
      });

      // Immediately add the game to the local state with proper image handling
      const newGame = {
        ...insertedGame,
        image: game.background_image || insertedGame.image,
        selectedPlatform: game.selectedPlatform || null,
        isWishlisted: game.isWishlisted || false,
      };

      // Update local state immediately for instant feedback
      setNotes((prevNotes) => [...prevNotes, newGame]);

      // Also fetch to ensure sync with backend
      await fetchNotes();

      const platformText = game.selectedPlatform
        ? ` for ${game.selectedPlatform.name}`
        : "";
      if (onShowToast) {
        onShowToast(
          `"${game.name}"${platformText} added to your ${
            game.isWishlisted ? "wishlist" : "library"
          }!`
        );
      }
    } catch (error) {
      console.error("Error adding game from search:", error);
      if (onShowToast) {
        onShowToast("Failed to add game. Please try the manual form.", "error");
      }
    }
  };

  // Create a game (manual form)
  const createNote = async (formData) => {
    if (!formData.name || !formData.description) return;

    try {
      const insertedGame = await fetchWithAuth("/api/games", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          genre: formData.genre,
          release_date: formData.releaseDate,
          players: parseInt(formData.players) || null,
          publisher: formData.publisher,
          image: formData.image,
          selectedPlatform: formData.selectedPlatform,
          rawgId: null, // Manual entries don't have RAWG ID
          isWishlisted: formData.isWishlisted || false, // Add wishlist status
        }),
      });

      // Update local state immediately for instant feedback
      setNotes((prevNotes) => [...prevNotes, insertedGame]);

      // Also fetch to ensure sync with backend
      await fetchNotes();

      if (onShowToast) {
        onShowToast(`"${formData.name}" added successfully!`);
      }
    } catch (error) {
      console.error("Error creating note:", error);
      if (onShowToast) {
        onShowToast("Failed to create game. Please try again.", "error");
      }
    }
  };

  // Delete function - removes a game
  const deleteNote = async (noteToDelete) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${noteToDelete.name}"?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    if (isDeletingGame) {
      if (onShowToast) {
        onShowToast(
          "Please wait - another game is currently being deleted.",
          "error"
        );
      }
      return;
    }

    setIsDeletingGame(true);

    // Store original notes for error recovery
    const originalNotes = [...notes];

    try {
      // Delete the game from the database
      await fetchWithAuth(`/api/games?id=${noteToDelete.id}`, {
        method: "DELETE",
      });

      // Also delete the image if it exists and it's not a RAWG URL
      if (noteToDelete.image && !noteToDelete.image.startsWith("http")) {
        try {
          await fetchWithAuth(
            `/api/images?file=${encodeURIComponent(noteToDelete.image)}`,
            {
              method: "DELETE",
            }
          );
        } catch (error) {
          // Don't fail the whole operation if image deletion fails
        }
      }

      // Refresh the games list to ensure consistency
      await fetchNotes();

      // Show success message
      if (onShowToast) {
        onShowToast(
          `"${noteToDelete.name}" has been successfully deleted from your library.`
        );
      }
    } catch (error) {
      // Restore the original notes on error
      setNotes(originalNotes);

      if (onShowToast) {
        onShowToast(
          `Failed to delete "${noteToDelete.name}". Please try again.`,
          "error"
        );
      }
    } finally {
      setIsDeletingGame(false);
    }
  };

  // Edit function - updates an existing game
  const updateNote = async (formData, editingNote, newImageUploaded) => {
    if (!formData.name || !formData.description) return;

    try {
      // If a new image was uploaded, delete the old one (only if it's a Netlify file)
      if (
        newImageUploaded &&
        editingNote.image &&
        !editingNote.image.startsWith("http")
      ) {
        try {
          await fetchWithAuth(
            `/api/images?file=${encodeURIComponent(editingNote.image)}`,
            {
              method: "DELETE",
            }
          );
        } catch (error) {
          // Error deleting old image, continue with update
        }
      }

      const updateData = {
        name: formData.name,
        description: formData.description,
        genre: formData.genre,
        release_date: formData.releaseDate,
        players: parseInt(formData.players) || null,
        publisher: formData.publisher,
        // Use new image if uploaded, otherwise keep original
        image: newImageUploaded ? formData.image : editingNote.image,
        // Update selectedPlatform from form data
        selectedPlatform: formData.selectedPlatform,
        rawgId: editingNote.rawgId || null,
        isWishlisted: editingNote.isWishlisted || false, // Preserve wishlist status
      };

      await fetchWithAuth(`/api/games?id=${editingNote.id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      await fetchNotes();
    } catch (error) {
      if (onShowToast) {
        onShowToast(`Update error: ${error.message}`, "error");
      }
    }
  };

  // Find and update missing images for existing games
  const updateMissingImages = async () => {
    if (isUpdatingImages) return;

    setIsUpdatingImages(true);

    try {
      // Find games without images
      const gamesWithoutImages = notes.filter(
        (note) => !note.image || note.image === ""
      );

      if (gamesWithoutImages.length === 0) {
        if (onShowToast) {
          onShowToast("All games already have images!");
        }
        setIsUpdatingImages(false);
        return;
      }

      let updatedCount = 0;

      for (const game of gamesWithoutImages) {
        try {
          // Search RAWG for this game
          const response = await fetch(
            `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(
              game.name
            )}&page_size=5`
          );

          if (!response.ok) {
            continue;
          }

          const data = await response.json();
          const searchResults = data.results || [];

          // Find the best match (exact name match or first result)
          let bestMatch = searchResults.find(
            (result) => result.name.toLowerCase() === game.name.toLowerCase()
          );

          if (!bestMatch && searchResults.length > 0) {
            bestMatch = searchResults[0];
          }

          if (bestMatch && bestMatch.background_image) {
            // Update the game with the new image
            await fetchWithAuth(`/api/games?id=${game.id}`, {
              method: "PUT",
              body: JSON.stringify({ image: bestMatch.background_image }),
            });

            updatedCount++;
          }

          // Add a small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          // Error processing game, continue with next
        }
      }

      if (updatedCount > 0) {
        if (onShowToast) {
          onShowToast(`Successfully updated images for ${updatedCount} games!`);
        }
        await fetchNotes(); // Refresh the games list
      } else {
        if (onShowToast) {
          onShowToast(
            "No images could be found for the games missing images.",
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Error updating missing images:", error);
      if (onShowToast) {
        onShowToast(
          "Failed to update missing images. Please try again.",
          "error"
        );
      }
    } finally {
      setIsUpdatingImages(false);
    }
  };

  // Toggle wishlist status for a game
  const toggleWishlist = async (note) => {
    try {
      const updatedGame = {
        ...note,
        isWishlisted: !note.isWishlisted,
      };

      await fetchWithAuth(`/api/games?id=${note.id}`, {
        method: "PUT",
        body: JSON.stringify(updatedGame),
      });

      // Update local state
      setNotes(notes.map((n) => (n.id === note.id ? updatedGame : n)));

      // Show heart notification
      if (onShowHeartNotification) {
        onShowHeartNotification(updatedGame.isWishlisted);
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      if (onShowToast) {
        onShowToast(
          "Failed to update wishlist status. Please try again.",
          "error"
        );
      }
    }
  };

  return {
    notes,
    isUpdatingImages,
    isDeletingGame,
    fetchNotes,
    addGameFromSearch,
    createNote,
    deleteNote,
    updateNote,
    updateMissingImages,
    toggleWishlist,
  };
};
