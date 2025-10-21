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

export const useGameManagement = (userId) => {
  const [notes, setNotes] = useState([]);
  const [isUpdatingImages, setIsUpdatingImages] = useState(false);
  const [isDeletingGame, setIsDeletingGame] = useState(false);

  // Fetch user's personal library
  const fetchNotes = useCallback(async () => {
    try {
      const games = await fetchWithAuth("/api/games");

      // Handle image URLs - check if it's a URL or a Netlify image
      const notesWithImages = games.map((note) => {
        console.log("🔍 Processing note:", {
          id: note.id,
          name: note.name,
          originalImage: note.image,
        });

        if (note.image) {
          // If it's already a full URL (from RAWG), use it directly
          if (
            note.image.startsWith("http://") ||
            note.image.startsWith("https://")
          ) {
            console.log("📷 Using direct URL for:", note.name, note.image);
            return { ...note, image: note.image };
          }
          // If it's a filename, get the URL from Netlify
          else {
            const imageUrl = `/api/images?file=${encodeURIComponent(
              note.image
            )}`;
            console.log("📁 Using Netlify image for:", note.name, imageUrl);
            return { ...note, image: imageUrl };
          }
        }
        console.log("❌ No image for:", note.name);
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
      };

      // Store the RAWG image URL directly
      if (game.background_image) {
        gameData.image = game.background_image;
        console.log("🎮 RAWG Game Data:", {
          name: game.name,
          platform: game.selectedPlatform?.name || "Multiple",
          imageUrl: game.background_image,
          gameData: gameData,
        });
      }

      const insertedGame = await fetchWithAuth("/api/games", {
        method: "POST",
        body: JSON.stringify(gameData),
      });

      console.log("✅ Game inserted successfully:", insertedGame);

      await fetchNotes();

      const platformText = game.selectedPlatform
        ? ` for ${game.selectedPlatform.name}`
        : "";
      alert(`"${game.name}"${platformText} added to your library!`);
    } catch (error) {
      console.error("Error adding game from search:", error);
      alert("Failed to add game. Please try the manual form.");
    }
  };

  // Create a game (manual form)
  const createNote = async (formData) => {
    if (!formData.name || !formData.description) return;

    try {
      await fetchWithAuth("/api/games", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          genre: formData.genre,
          release_date: formData.releaseDate,
          players: parseInt(formData.players) || null,
          publisher: formData.publisher,
          image: formData.image,
          selectedPlatform: null, // Manual entries don't have selectedPlatform
          rawgId: null, // Manual entries don't have RAWG ID
        }),
      });

      await fetchNotes();
    } catch (error) {
      console.error("Error creating note:", error);
      alert("Failed to create game. Please try again.");
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
      alert("Please wait - another game is currently being deleted.");
      return;
    }

    setIsDeletingGame(true);

    // Optimistically remove the game from UI immediately
    const originalNotes = [...notes];
    setNotes(notes.filter((note) => note.id !== noteToDelete.id));

    try {
      console.log("🗑️ Deleting game:", noteToDelete.name);

      // Delete the game from the database
      await fetchWithAuth(`/api/games?id=${noteToDelete.id}`, {
        method: "DELETE",
      });

      console.log("✅ Game deleted from database");

      // Also delete the image if it exists and it's not a RAWG URL
      if (noteToDelete.image && !noteToDelete.image.startsWith("http")) {
        try {
          await fetchWithAuth(
            `/api/images?file=${encodeURIComponent(noteToDelete.image)}`,
            {
              method: "DELETE",
            }
          );
          console.log("🖼️ Associated image deleted");
        } catch (error) {
          console.error("Error deleting image:", error);
          // Don't fail the whole operation if image deletion fails
        }
      }

      // Refresh the games list to ensure consistency
      console.log("🔄 Refreshing games list...");
      await fetchNotes();

      // Show success message
      alert(
        `"${noteToDelete.name}" has been successfully deleted from your library.`
      );

      console.log("✅ Game deletion completed successfully");
    } catch (error) {
      console.error("Error deleting note:", error);

      // Restore the original notes on error
      setNotes(originalNotes);

      alert(
        `Failed to delete "${noteToDelete.name}". Please try again.\n\nError: ${error.message}`
      );
    } finally {
      setIsDeletingGame(false);
    }
  };

  // Edit function - updates an existing game
  const updateNote = async (formData, editingNote, newImageUploaded) => {
    if (!formData.name || !formData.description) return;

    console.log("Updating note with data:", formData);
    console.log("New image uploaded:", newImageUploaded);
    console.log("Original note image:", editingNote.image);

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
          console.log("Deleted old image:", editingNote.image);
        } catch (error) {
          console.error("Error deleting old image:", error);
        }
      }

      const updateData = {
        name: formData.name,
        description: formData.description,
        genre: formData.genre,
        release_date: formData.releaseDate,
        players: parseInt(formData.players) || null,
        publisher: formData.publisher,
        image: formData.image,
        // Preserve the selectedPlatform if it exists
        selectedPlatform: editingNote.selectedPlatform || null,
        rawgId: editingNote.rawgId || null,
      };

      await fetchWithAuth(`/api/games?id=${editingNote.id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      console.log("Note updated successfully");
      await fetchNotes();
    } catch (error) {
      console.error("Error updating note:", error);
      alert(`Update error: ${error.message}`);
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
        alert("All games already have images!");
        setIsUpdatingImages(false);
        return;
      }

      console.log(
        `🔍 Found ${gamesWithoutImages.length} games without images:`,
        gamesWithoutImages.map((g) => g.name)
      );

      let updatedCount = 0;

      for (const game of gamesWithoutImages) {
        try {
          console.log(`🎮 Searching for image for: ${game.name}`);

          // Search RAWG for this game
          const response = await fetch(
            `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(
              game.name
            )}&page_size=5`
          );

          if (!response.ok) {
            console.log(`❌ Failed to search for ${game.name}`);
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
            console.log(
              `📷 Found image for ${game.name}:`,
              bestMatch.background_image
            );

            // Update the game with the new image
            await fetchWithAuth(`/api/games?id=${game.id}`, {
              method: "PUT",
              body: JSON.stringify({ image: bestMatch.background_image }),
            });

            console.log(`✅ Updated image for ${game.name}`);
            updatedCount++;
          } else {
            console.log(`❌ No image found for ${game.name}`);
          }

          // Add a small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error processing ${game.name}:`, error);
        }
      }

      if (updatedCount > 0) {
        alert(`Successfully updated images for ${updatedCount} games!`);
        await fetchNotes(); // Refresh the games list
      } else {
        alert("No images could be found for the games missing images.");
      }
    } catch (error) {
      console.error("Error updating missing images:", error);
      alert("Failed to update missing images. Please try again.");
    } finally {
      setIsUpdatingImages(false);
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
  };
};
