import { useEffect, useState } from 'react';
import './App.css';
import '@aws-amplify/ui-react/styles.css';
import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlusSquare, faChevronDown, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import GameSearch from './components/GameSearch';
import GameLibrary from './components/GameLibrary';
import GameForm from './components/GameForm';
import GameModal from './components/GameModal';
import { useGameManagement } from './hooks/useGameManagement';

library.add(faPlusSquare, faChevronDown, faSearch, faTimes)

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
      document.getElementById('game-form')?.scrollIntoView({ behavior: 'smooth' });
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
          {/* Header */}
          <div className='container flex justify-center align-center flex-col py-8 mx-auto'>
            <h1 className='text-2xl text-slate-800'>Welcome to your personal game library</h1>
            <p className='text-blue-500 uppercase tracking-widest'>play has no limits</p>

            <p className='pt-8'>
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