import { useState, useCallback, useRef } from "react";

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

  // Read response as text first to avoid unhandled JSON parse errors
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      // Not JSON, preserve raw text
      data = text;
    }
  }

  if (!response.ok) {
    const errMsg =
      (data && data.error) || data || response.statusText || "Request failed";
    throw new Error(
      typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg)
    );
  }

  return data;
};

export const useGameManagement = (
  userId,
  onShowToast,
  onShowHeartNotification
) => {
  const [notes, setNotes] = useState([]);
  const [isUpdatingImages, setIsUpdatingImages] = useState(false);
  const [deletingGameId, setDeletingGameId] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  // Map to track optimistic creates: tempId -> { promise, resolve, reject }
  const pendingCreatesRef = useRef(new Map());

  // Fetch user's personal library
  const fetchNotes = useCallback(async () => {
    try {
      console.log("[useGameManagement] fetchNotes start");
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

      // Merge server results with any local optimistic notes so we don't drop
      // optimistic entries if the server response hasn't yet included them.
      setNotes((prev) => {
        try {
          const serverMap = new Map();
          notesWithImages.forEach((n) => serverMap.set(n.id, n));

          // Start with server-provided notes
          const merged = [...notesWithImages];

          // Include any optimistic local notes (tmp- ids) or any notes
          // that aren't present on the server yet
          prev.forEach((local) => {
            if (!local || !local.id) return;
            if (local.id.startsWith("tmp-")) {
              // keep optimistic entries
              merged.push(local);
            } else if (!serverMap.has(local.id)) {
              // keep local entries that server doesn't return (avoid data loss)
              merged.push(local);
            }
          });

          console.log(
            `[useGameManagement] fetchNotes setNotes mergedCount=${merged.length} serverCount=${notesWithImages.length} localPrev=${prev.length}`
          );
          return merged;
        } catch (err) {
          console.warn("[useGameManagement] fetchNotes merge error:", err);
          return notesWithImages;
        }
      });
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  }, []);

  // Add game from search results
  const addGameFromSearch = async (game) => {
    try {
      // Fetch complete game details from RAWG API to get publisher info
      let completeGameData = game;
      if (game.id && (!game.publishers || game.publishers.length === 0)) {
        try {
          const detailResponse = await fetch(
            `${RAWG_BASE_URL}/games/${game.id}?key=${RAWG_API_KEY}`
          );
          if (detailResponse.ok) {
            completeGameData = await detailResponse.json();
          }
        } catch (err) {
          console.warn("Failed to fetch complete game data:", err);
          // Continue with original data if detail fetch fails
        }
      }

      // Format the game data from RAWG API
      const gameData = {
        name: completeGameData.name,
        // If a specific platform was selected, use it; otherwise use all platforms
        description: game.selectedPlatform
          ? game.selectedPlatform.name
          : completeGameData.platforms?.map((p) => p.platform.name).join(", ") ||
            "Multiple Platforms",
        genre: completeGameData.genres?.map((g) => g.name).join(", ") || "",
        release_date: completeGameData.released || "",
        players: completeGameData.tags?.find((tag) => tag.name.includes("Multiplayer"))
          ? 2
          : 1,
        publisher: completeGameData.publishers?.[0]?.name || "Unknown",
        image: "",
        // Store the selected platform information
        selectedPlatform: game.selectedPlatform || null,
        rawgId: completeGameData.id, // Store original RAWG ID
        isWishlisted: game.isWishlisted || false, // Add wishlist status
      };

      // Store the RAWG image URL directly
      if (completeGameData.background_image) {
        gameData.image = completeGameData.background_image;
      }
      // Optimistic update: add a temporary note so the UI updates instantly
      const tempId = `tmp-${Date.now()}`;
      const tempNote = {
        ...gameData,
        id: tempId,
        created_at: new Date().toISOString(),
        user_id: userId || null,
      };

      // Normalize image URL for display (if it's not a full URL, treat as Netlify filename)
      if (tempNote.image && !tempNote.image.startsWith("http")) {
        tempNote.image = `/api/images?file=${encodeURIComponent(
          tempNote.image
        )}`;
      }

      // Create a promise that will resolve/reject when the server responds
      let resolveFn;
      let rejectFn;
      const createdPromise = new Promise((res, rej) => {
        resolveFn = res;
        rejectFn = rej;
      });
      pendingCreatesRef.current.set(tempId, {
        promise: createdPromise,
        resolve: resolveFn,
        reject: rejectFn,
      });
      console.log(
        `[useGameManagement] addGameFromSearch registered pending ${tempId} name=${tempNote.name}`
      );

      setNotes((prev) => [...prev, tempNote]);
      console.log(
        `[useGameManagement] addGameFromSearch optimistic added ${tempId} name=${tempNote.name}`
      );

      try {
        // Send create request
        console.log(
          `[useGameManagement] addGameFromSearch POST start ${tempId}`
        );
        const createdGame = await fetchWithAuth("/api/games", {
          method: "POST",
          body: JSON.stringify(gameData),
        });

        // Normalize created game image for display
        const createdNormalized = { ...createdGame };
        if (
          createdNormalized.image &&
          !createdNormalized.image.startsWith("http")
        ) {
          createdNormalized.image = `/api/images?file=${encodeURIComponent(
            createdNormalized.image
          )}`;
        }

        // Replace temporary note with the server-created note
        setNotes((prev) =>
          prev.map((n) => (n.id === tempId ? createdNormalized : n))
        );
        console.log(
          `[useGameManagement] addGameFromSearch POST success ${tempId} -> realId=${createdNormalized.id}`
        );

        // Resolve the pending create so any waiting updates (edits) can proceed
        const pending = pendingCreatesRef.current.get(tempId);
        if (pending && pending.resolve) {
          pending.resolve(createdNormalized);
          console.log(
            `[useGameManagement] addGameFromSearch resolved pending ${tempId}`
          );
        }
        pendingCreatesRef.current.delete(tempId);

        // Background reconcile: ensure we eventually match server state
        // Do not await so UI stays responsive
        fetchNotes().catch((e) =>
          console.warn("Background fetchNotes failed:", e)
        );
      } catch (postErr) {
        // Remove temporary note on failure
        setNotes((prev) => prev.filter((n) => n.id !== tempId));
        console.log(
          `[useGameManagement] addGameFromSearch POST failed ${tempId} error=${postErr.message}`
        );
        const pending = pendingCreatesRef.current.get(tempId);
        if (pending && pending.reject) pending.reject(postErr);
        pendingCreatesRef.current.delete(tempId);

        console.error("Error adding game from search (POST):", postErr);
        if (onShowToast) {
          onShowToast(
            "Failed to add game. Please try the manual form.",
            "error"
          );
        }
        return;
      }

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
      // Optimistic update: create a temporary note locally first
      const tempId = `tmp-${Date.now()}`;
      const tempNote = {
        id: tempId,
        name: formData.name,
        description: formData.description,
        genre: formData.genre,
        release_date: formData.releaseDate,
        players: parseInt(formData.players) || null,
        publisher: formData.publisher,
        image: formData.image || "",
        selectedPlatform: formData.selectedPlatform,
        rawgId: null,
        isWishlisted: formData.isWishlisted || false,
        created_at: new Date().toISOString(),
        user_id: userId || null,
      };

      if (tempNote.image && !tempNote.image.startsWith("http")) {
        tempNote.image = `/api/images?file=${encodeURIComponent(
          tempNote.image
        )}`;
      }

      // Create a promise that will resolve/reject when the server responds
      let resolveFn;
      let rejectFn;
      const createdPromise = new Promise((res, rej) => {
        resolveFn = res;
        rejectFn = rej;
      });
      pendingCreatesRef.current.set(tempId, {
        promise: createdPromise,
        resolve: resolveFn,
        reject: rejectFn,
      });
      console.log(
        `[useGameManagement] createNote registered pending ${tempId} name=${tempNote.name}`
      );

      setNotes((prev) => [...prev, tempNote]);
      console.log(
        `[useGameManagement] createNote optimistic added ${tempId} name=${tempNote.name}`
      );

      try {
        console.log(`[useGameManagement] createNote POST start ${tempId}`);
        const created = await fetchWithAuth("/api/games", {
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

        const createdNote = { ...created };
        if (createdNote.image && !createdNote.image.startsWith("http")) {
          createdNote.image = `/api/images?file=${encodeURIComponent(
            createdNote.image
          )}`;
        }

        // Replace temp with server-created note
        setNotes((prev) =>
          prev.map((n) => (n.id === tempId ? createdNote : n))
        );
        console.log(
          `[useGameManagement] createNote POST success ${tempId} -> realId=${createdNote.id}`
        );

        // Resolve the pending create so any waiting edits can proceed
        const pending = pendingCreatesRef.current.get(tempId);
        if (pending && pending.resolve) {
          pending.resolve(createdNote);
          console.log(
            `[useGameManagement] createNote resolved pending ${tempId}`
          );
        }
        pendingCreatesRef.current.delete(tempId);

        // Background reconcile
        fetchNotes().catch((e) =>
          console.warn("Background fetchNotes failed:", e)
        );
      } catch (postErr) {
        // Remove optimistic item and show error
        setNotes((prev) => prev.filter((n) => n.id !== tempId));
        console.log(
          `[useGameManagement] createNote POST failed ${tempId} error=${postErr.message}`
        );
        const pending = pendingCreatesRef.current.get(tempId);
        if (pending && pending.reject) pending.reject(postErr);
        pendingCreatesRef.current.delete(tempId);

        console.error("Error creating note (POST):", postErr);
        if (onShowToast) {
          onShowToast("Failed to create game. Please try again.", "error");
        }
        return;
      }

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

    if (deletingGameId) {
      if (onShowToast) {
        onShowToast(
          "Please wait - another game is currently being deleted.",
          "error"
        );
      }
      return;
    }

    setDeletingGameId(noteToDelete.id);

    // Store original notes for error recovery
    const originalNotes = [...notes];

    try {
      // Immediately remove the game from UI for instant feedback
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteToDelete.id));

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

      // Show success message with platform information
      const platformText = noteToDelete.selectedPlatform
        ? ` for ${noteToDelete.selectedPlatform.name}`
        : "";
      if (onShowToast) {
        onShowToast(
          `"${noteToDelete.name}"${platformText} has been successfully deleted from your ${
            noteToDelete.isWishlisted ? "wishlist" : "library"
          }!`
        );
      }
    } catch (error) {
      // Restore the original notes on error
      setNotes(originalNotes);

      const platformText = noteToDelete.selectedPlatform
        ? ` for ${noteToDelete.selectedPlatform.name}`
        : "";
      if (onShowToast) {
        onShowToast(
          `Failed to delete "${noteToDelete.name}"${platformText}. Please try again.`,
          "error"
        );
      }
    } finally {
      setDeletingGameId(null);
    }
  };

  // Edit function - updates an existing game
  const updateNote = async (formData, editingNote, newImageUploaded) => {
    if (!formData.name || !formData.description) return;

    try {
      // If this note is an optimistic temp item, wait for the server to return the real item
      let noteToUpdate = editingNote;
      if (editingNote.id && String(editingNote.id).startsWith("tmp-")) {
        console.log(
          `[useGameManagement] updateNote waiting for pending create ${editingNote.id}`
        );
        const pending = pendingCreatesRef.current.get(editingNote.id);
        if (pending && pending.promise) {
          try {
            const resolved = await pending.promise;
            noteToUpdate = resolved;
            console.log(
              `[useGameManagement] updateNote pending resolved ${editingNote.id} -> ${noteToUpdate.id}`
            );
          } catch (err) {
            // If the create failed, abort update
            if (onShowToast)
              onShowToast("Cannot edit: original create failed.", "error");
            console.log(
              `[useGameManagement] updateNote pending rejected ${editingNote.id} error=${err.message}`
            );
            return;
          }
        } else {
          // No pending create found - attempt to fetch latest list and find item
          console.log(
            `[useGameManagement] updateNote no pending found for ${editingNote.id}, fetching notes`
          );
          await fetchNotes();
          const found = notes.find((n) => n.id === editingNote.id);
          if (found) {
            noteToUpdate = found;
            console.log(
              `[useGameManagement] updateNote found note after fetch ${found.id}`
            );
          }
        }
      }

      // If a new image was uploaded, delete the old one (only if it's a Netlify file)
      if (
        newImageUploaded &&
        noteToUpdate.image &&
        !noteToUpdate.image.startsWith("http")
      ) {
        try {
          await fetchWithAuth(
            `/api/images?file=${encodeURIComponent(noteToUpdate.image)}`,
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
        image: newImageUploaded ? formData.image : noteToUpdate.image,
        // Update selectedPlatform from form data
        selectedPlatform: formData.selectedPlatform,
        rawgId: noteToUpdate.rawgId || null,
        isWishlisted: noteToUpdate.isWishlisted || false, // Preserve wishlist status
      };

      console.log(
        `[useGameManagement] updateNote PUT start id=${noteToUpdate.id}`
      );
      await fetchWithAuth(`/api/games?id=${noteToUpdate.id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
      console.log(
        `[useGameManagement] updateNote PUT success id=${noteToUpdate.id}`
      );

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

  // Share library function
  const createShareLink = async (ownerName) => {
    try {
      console.log("[createShareLink] Creating share link for:", ownerName);
      
      const data = await fetchWithAuth("/api/shared-library", {
        method: "POST",
        body: JSON.stringify({ ownerName }),
      });

      console.log("[createShareLink] Success:", data);
      
      setShareLink(data.shareUrl);
      
      if (onShowToast) {
        onShowToast("Share link created! Link copied to clipboard.");
      }
      
      // Copy to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(data.shareUrl);
      } else {
        console.warn("[createShareLink] Clipboard API not available");
      }
      
      return data.shareUrl;
    } catch (error) {
      console.error("[createShareLink] Error creating share link:", error);
      if (onShowToast) {
        onShowToast(`Failed to create share link: ${error.message}`, "error");
      }
      throw error;
    }
  };

  // Export wishlist as CSV
  const exportWishlistCSV = () => {
    try {
      const wishlistGames = notes.filter(note => note.isWishlisted);
      
      if (wishlistGames.length === 0) {
        if (onShowToast) {
          onShowToast("No wishlist items to export.", "error");
        }
        return;
      }

      const csvHeaders = ["Game Name", "Platform", "Genre", "Release Date", "Publisher", "Players"];
      const csvRows = [csvHeaders];

      wishlistGames.forEach(game => {
        csvRows.push([
          game.name || "",
          game.selectedPlatform?.name || "",
          game.genre || "",
          game.release_date || "",
          game.publisher || "",
          game.players || ""
        ]);
      });

      const csvContent = csvRows.map(row => 
        row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`).join(",")
      ).join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `wishlist_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      if (onShowToast) {
        onShowToast(`Wishlist exported! ${wishlistGames.length} games saved to CSV.`);
      }
    } catch (error) {
      console.error("Error exporting CSV:", error);
      if (onShowToast) {
        onShowToast("Failed to export wishlist. Please try again.", "error");
      }
    }
  };

  // Export wishlist as PDF (using HTML to PDF approach)
  const exportWishlistPDF = () => {
    try {
      const wishlistGames = notes.filter(note => note.isWishlisted);
      
      if (wishlistGames.length === 0) {
        if (onShowToast) {
          onShowToast("No wishlist items to export.", "error");
        }
        return;
      }

      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>My Game Wishlist</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
            .header h1 { color: #007bff; margin: 0; }
            .header p { color: #666; margin: 10px 0 0 0; }
            .game { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .game-title { font-size: 18px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
            .game-detail { margin: 5px 0; }
            .label { font-weight: bold; color: #555; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
            @media print {
              body { margin: 20px; }
              .game { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎮 My Game Wishlist</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            <p>Total Games: ${wishlistGames.length}</p>
          </div>
          
          ${wishlistGames.map((game, index) => `
            <div class="game">
              <div class="game-title">${index + 1}. ${game.name || 'Unknown Title'}</div>
              ${game.selectedPlatform ? `<div class="game-detail"><span class="label">Platform:</span> ${game.selectedPlatform.name}</div>` : ''}
              ${game.genre ? `<div class="game-detail"><span class="label">Genre:</span> ${game.genre}</div>` : ''}
              ${game.release_date ? `<div class="game-detail"><span class="label">Release Date:</span> ${game.release_date}</div>` : ''}
              ${game.publisher ? `<div class="game-detail"><span class="label">Publisher:</span> ${game.publisher}</div>` : ''}
              ${game.players ? `<div class="game-detail"><span class="label">Players:</span> ${game.players}</div>` : ''}
              ${game.description ? `<div class="game-detail"><span class="label">Description:</span> ${game.description}</div>` : ''}
            </div>
          `).join('')}
          
          <div class="footer">
            <p>Generated by Game Library App • ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;

      // Open in new window for printing/saving as PDF
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Auto-focus and trigger print dialog
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };

      if (onShowToast) {
        onShowToast(`Wishlist PDF opened! ${wishlistGames.length} games ready to print/save.`);
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      if (onShowToast) {
        onShowToast("Failed to export wishlist PDF. Please try again.", "error");
      }
    }
  };

  return {
    notes,
    isUpdatingImages,
    deletingGameId,
    shareLink,
    fetchNotes,
    addGameFromSearch,
    createNote,
    deleteNote,
    updateNote,
    updateMissingImages,
    toggleWishlist,
    createShareLink,
    exportWishlistCSV,
    exportWishlistPDF,
  };
};
