import { useEffect, useState } from "react";
import "./App.css";
import { useAuth } from "./contexts/AuthContext.jsx";
import Login from "./components/Login.jsx";
import GuidedTour from "./components/GuidedTour.jsx";
import GameSearch from "./components/GameSearch.jsx";
import GameLibrary from "./components/GameLibrary.jsx";
import GameForm from "./components/GameForm.jsx";
import GameModal from "./components/GameModal.jsx";
import GamingPlatformLogos from "./components/GamingPlatformLogos.jsx";
import ShareExportControls from "./components/ShareExportControls.jsx";
import NavActionButtons from "./components/NavActionButtons.jsx";
import SharedLibrary from "./components/SharedLibrary.jsx";
import { useGameManagement } from "./hooks/useGameManagement";

// Toast notification component
const Toast = ({ message, type = "success", onClose, isVisible }) => {
  if (!isVisible) return null;

  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div
        className={`${bgColor} text-white px-6 py-4 rounded-xs shadow-lg flex items-center space-x-3 max-w-sm`}
      >
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 focus:outline-none"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Animated Heart Notification component
const AnimatedHeartNotification = ({ isVisible, isWishlisted }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="like-wrapper">
        <input
          className="check"
          type="checkbox"
          id="like-toggle"
          checked={isWishlisted}
          readOnly
        />
        <label className="container" htmlFor="like-toggle">
          <svg
            viewBox="0 0 512 512"
            xmlns="http://www.w3.org/2000/svg"
            className="icon inactive"
          >
            <path d="M225.8 468.2l-2.5-2.3L48.1 303.2C17.4 274.7 0 234.7 0 192.8v-3.3c0-70.4 50-130.8 119.2-144C158.6 37.9 198.9 47 231 69.6c9 6.4 17.4 13.8 25 22.3c4.2-4.8 8.7-9.2 13.5-13.3c3.7-3.2 7.5-6.2 11.5-9c0 0 0 0 0 0C313.1 47 353.4 37.9 392.8 45.4C462 58.6 512 119.1 512 189.5v3.3c0 41.9-17.4 81.9-48.1 110.4L288.7 465.9l-2.5 2.3c-8.2 7.6-19 11.9-30.2 11.9s-22-4.2-30.2-11.9zM239.1 145c-.4-.3-.7-.7-1-1.1l-17.8-20c0 0-.1-.1-.1-.1c0 0 0 0 0 0c-23.1-25.9-58-37.7-92-31.2C81.6 101.5 48 142.1 48 189.5v3.3c0 28.5 11.9 55.8 32.8 75.2L256 430.7 431.2 268c20.9-19.4 32.8-46.7 32.8-75.2v-3.3c0-47.3-33.6-88-80.1-96.9c-34-6.5-69 5.4-92 31.2c0 0 0 0-.1 .1s0 0-.1 .1l-17.8 20c-.3 .4-.7 .7-1 1.1c-4.5 4.5-10.6 7-16.9 7s-12.4-2.5-16.9-7z"></path>
          </svg>
          <svg
            viewBox="0 0 512 512"
            xmlns="http://www.w3.org/2000/svg"
            className="icon active"
          >
            <path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z"></path>
          </svg>
          <div className="checkmark"></div>
          <span className="like-text">
            {isWishlisted ? "Added to Wishlist!" : "Removed from Wishlist!"}
          </span>
        </label>
      </div>
    </div>
  );
};

// Main Game Library Component
function GameLibraryApp() {
  const { user, isAdmin, signOut } = useAuth();
  const [modalIsOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);

  // Toast notification helper
  const [toast, setToast] = useState({
    message: "",
    type: "success",
    isVisible: false,
  });

  // Heart notification helper
  const [heartNotification, setHeartNotification] = useState({
    isVisible: false,
    isWishlisted: false,
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      setToast({ message: "", type: "success", isVisible: false });
    }, 4000); // Auto-hide after 4 seconds
  };

  const hideToast = () => {
    setToast({ message: "", type: "success", isVisible: false });
  };

  const showHeartNotification = (isWishlisted) => {
    setHeartNotification({ isVisible: true, isWishlisted });
    setTimeout(() => {
      setHeartNotification({ isVisible: false, isWishlisted: false });
    }, 3000); // Auto-hide after 3 seconds
  };

  // Use the game management hook
  const {
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
    updateMissingInformation,
    toggleWishlist,
    createShareLink,
    createWishlistShareLink,
    exportWishlistCSV,
    exportWishlistPDF,
  } = useGameManagement(user.id, showToast, showHeartNotification);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Modal functions
  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  // Form handlers
  const handleGameAdd = async (game) => {
    await addGameFromSearch(game);
  };

  const handleFormSubmit = async (formData, newImageUploaded) => {
    if (editMode) {
      await updateNote(formData, editingNote, newImageUploaded);
      setEditingNote(null);
      setEditMode(false);
      setShowManualForm(false);
      // Restore scroll position after editing
      restoreScrollPosition();
    } else {
      await createNote(formData);
      setShowManualForm(false);
    }
  };

  const handleFormCancel = () => {
    setEditingNote(null);
    setEditMode(false);
    setShowManualForm(false);
    // Restore scroll position when canceling edit
    if (editMode) {
      restoreScrollPosition();
    }
  };

  const handleEdit = (note) => {
    // Save current scroll position before opening edit form
    setSavedScrollPosition(window.scrollY);

    setEditingNote(note);
    setEditMode(true);
    setShowManualForm(true);
    // Scroll to form
    setTimeout(() => {
      document
        .getElementById("game-form")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Helper function to restore scroll position after form operations
  const restoreScrollPosition = () => {
    setTimeout(() => {
      window.scrollTo({
        top: savedScrollPosition,
        behavior: "smooth",
      });
    }, 100);
  };

  const handleViewInfo = (note) => {
    setModalData(note);
    openModal();
  };

  return (
    <>
      {/* Navigation */}
      <nav className="bg-white-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-5">
              <div className="flex-shrink-0 h-8 w-8">
                <GamingPlatformLogos mode="rotate" interval={3000} />
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2">
              <div className="text-sm text-gray-600 mr-4">
                Welcome, {user?.email}{" "}
                {isAdmin && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs ml-2">
                    Admin
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              {notes.length > 0 && (
                <NavActionButtons
                  onShare={createShareLink}
                  onShareWishlist={createWishlistShareLink}
                  onExportCSV={exportWishlistCSV}
                  onExportPDF={exportWishlistPDF}
                  wishlistCount={
                    notes.filter((note) => note.isWishlisted).length
                  }
                  totalGames={notes.filter((note) => !note.isWishlisted).length}
                />
              )}

              <button
                onClick={signOut}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm"
              >
                Sign Out
              </button>
            </div>
            <div className="-mr-2 flex md:hidden items-center space-x-2">
              {/* Action Buttons for Mobile */}
              {notes.length > 0 && (
                <NavActionButtons
                  onShare={createShareLink}
                  onShareWishlist={createWishlistShareLink}
                  onExportCSV={exportWishlistCSV}
                  onExportPDF={exportWishlistPDF}
                  wishlistCount={
                    notes.filter((note) => note.isWishlisted).length
                  }
                  totalGames={notes.filter((note) => !note.isWishlisted).length}
                />
              )}

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
        <div className="App">
          {/* Header */}
          <div className="container flex justify-center align-center flex-col py-8 mx-auto">
            <h1 className="text-2xl text-slate-800">
              Welcome to your personal game library
            </h1>
            <p className="text-blue-500 uppercase tracking-widest">
              play has no limits
            </p>

            <p className="pt-8">
              Create and manage your personal game collection here.
              <br />
              Add games you own, want to play, or have completed!
            </p>
          </div>

          {/* Game Search Component */}
          <GameSearch
            onGameAdd={handleGameAdd}
            onToggleManualForm={() => setShowManualForm(!showManualForm)}
            showManualForm={showManualForm}
            onUpdateMissingImages={updateMissingImages}
            onUpdateMissingInformation={updateMissingInformation}
            hasGames={notes.length > 0}
            isUpdatingImages={isUpdatingImages}
            existingGames={notes}
          />

          {/* Game Library Component */}
          <GameLibrary
            notes={notes}
            onViewInfo={handleViewInfo}
            onEdit={handleEdit}
            onDelete={deleteNote}
            onToggleWishlist={toggleWishlist}
            deletingGameId={deletingGameId}
          />

          {/* Game Modal Component */}
          <GameModal
            isOpen={modalIsOpen}
            onClose={closeModal}
            gameData={modalData}
          />

          {/* Game Form Component */}
          <GameForm
            show={showManualForm}
            editMode={editMode}
            editingNote={editingNote}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            userId={user.id}
          />
        </div>
      </main>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
        isVisible={toast.isVisible}
      />

      {/* Animated Heart Notification */}
      <AnimatedHeartNotification
        isVisible={heartNotification.isVisible}
        isWishlisted={heartNotification.isWishlisted}
      />
    </>
  );
}

// Main App Component with Authentication
export default function App() {
  const { user, loading } = useAuth();
  const [showTour, setShowTour] = useState(false);

  // Check if this is a shared library URL
  const currentPath = window.location.pathname;
  const isSharedLibrary = currentPath.startsWith("/shared/");

  if (isSharedLibrary) {
    // Extract shareId from URL path like /shared/abc123-def456
    const shareId = currentPath.split("/shared/")[1];

    if (shareId) {
      return <SharedLibrary shareId={shareId} />;
    } else {
      // Invalid shared URL
      return (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Invalid Share Link</h2>
            <p className="text-gray-400">
              The shared library link is not valid.
            </p>
          </div>
        </div>
      );
    }
  }

  // Show guided tour if requested
  if (showTour && !user) {
    return <GuidedTour onComplete={() => setShowTour(false)} />;
  }

  // Show login screen if not authenticated
  if (!user && !loading) {
    return <Login onStartTour={() => setShowTour(true)} />;
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
  return <GameLibraryApp />;
}
