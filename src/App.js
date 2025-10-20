import { useEffect, useState } from "react";
import "./App.css";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faPlusSquare,
  faChevronDown,
  faSearch,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import GameSearch from "./components/GameSearch";
import GameLibrary from "./components/GameLibrary";
import GameForm from "./components/GameForm";
import GameModal from "./components/GameModal";
import GamingPlatformLogos from "./components/GamingPlatformLogos";
import { useGameManagement } from "./hooks/useGameManagement";

library.add(faPlusSquare, faChevronDown, faSearch, faTimes);

// Main Game Library Component
function GameLibraryApp() {
  const { user, isAdmin, signOut } = useAuth();
  const [modalIsOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);

  // Use the game management hook
  const {
    notes,
    isUpdatingImages,
    fetchNotes,
    addGameFromSearch,
    createNote,
    deleteNote,
    updateNote,
    updateMissingImages,
  } = useGameManagement(user.id);

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
    } else {
      await createNote(formData);
      setShowManualForm(false);
    }
  };

  const handleFormCancel = () => {
    setEditingNote(null);
    setEditMode(false);
    setShowManualForm(false);
  };

  const handleEdit = (note) => {
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
              <div className="flex-shrink-0">
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
            hasGames={notes.length > 0}
            isUpdatingImages={isUpdatingImages}
          />

          {/* Game Library Component */}
          <GameLibrary
            notes={notes}
            onViewInfo={handleViewInfo}
            onEdit={handleEdit}
            onDelete={deleteNote}
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
  return <GameLibraryApp />;
}
