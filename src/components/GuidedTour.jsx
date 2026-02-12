import React, { useState, useEffect } from "react";
import GameSearch from "./GameSearch";
import GameLibrary from "./GameLibrary";
import GameModal from "./GameModal";
import GameForm from "./GameForm";
import GamingPlatformLogos from "./GamingPlatformLogos";

// Demo games data
const DEMO_GAMES = [
  {
    id: "demo-1",
    name: "Sonic the Hedgehog",
    selectedPlatform: { id: 1, name: "Sega Mega Drive" },
    genre: "Platform",
    rating: 5,
    status: "Completed",
    image: "https://images.igdb.com/igdb/image/upload/t_cover_big/co49x5.jpg",
    releaseDate: "1991-06-23",
    isWishlisted: false,
  },
  {
    id: "demo-2",
    name: "Battlefield 2042",
    selectedPlatform: { id: 2, name: "PlayStation 5" },
    genre: "First-Person Shooter",
    rating: 4,
    status: "Currently Playing",
    image: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2r7v.jpg",
    releaseDate: "2021-11-19",
    isWishlisted: false,
  },
  {
    id: "demo-3",
    name: "Super Mario Odyssey",
    selectedPlatform: { id: 3, name: "Nintendo Switch" },
    genre: "Platform",
    rating: 5,
    status: "Completed",
    image: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3op4.jpg",
    releaseDate: "2017-10-27",
    isWishlisted: false,
  },
];

const GuidedTour = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(() => {
    // Load tour progress from localStorage (demo only)
    const saved = localStorage.getItem("guidedTour_currentStep");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [demoGames, setDemoGames] = useState(() => {
    // Load demo games from localStorage (demo only)
    const saved = localStorage.getItem("guidedTour_demoGames");
    return saved ? JSON.parse(saved) : [];
  });
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  // Save demo state to localStorage (separate from main app)
  useEffect(() => {
    localStorage.setItem("guidedTour_currentStep", currentStep.toString());
    localStorage.setItem("guidedTour_demoGames", JSON.stringify(demoGames));
  }, [currentStep, demoGames]);

  // Clear demo data when tour completes
  const handleComplete = () => {
    localStorage.removeItem("guidedTour_currentStep");
    localStorage.removeItem("guidedTour_demoGames");
    onComplete();
  };

  const steps = [
    {
      title: "Welcome to Your Game Library Manager! 🎮",
      description:
        "Let's take a quick tour to show you how easy it is to organize your gaming collection. Click 'Next' to continue.",
      action: null,
      component: "welcome",
    },
    {
      title: "Step 1: Add Your First Game",
      description:
        "Search for 'Sonic the Hedgehog' and add it to your library. Select the Genesis platform when prompted.",
      action: "addSonic",
      component: "search",
      targetGame: "sonic",
    },
    {
      title: "Step 2: Add Another Game",
      description:
        "Great! Now search for 'Battlefield 6' and add it. Select PlayStation 5 as the platform.",
      action: "addBattlefield",
      component: "search",
      targetGame: "battlefield",
    },
    {
      title: "Step 3: Add One More Game",
      description:
        "Almost there! Search for 'Super Mario Galaxy' and add it. Select Nintendo Switch as the platform.",
      action: "addMario",
      component: "search",
      targetGame: "mario",
    },
    {
      title: "Step 4: View Your Library",
      description:
        "Excellent! You've added three games. Click 'View Info' on any game to see its details, including cover art, platform, and genre.",
      action: "viewInfo",
      component: "library",
      highlight: ".game-card",
    },
    {
      title: "Step 5: Edit Your Games",
      description:
        "You can edit game information, change platform, and description. Click the edit button on Sonic and update its description then scroll down and hit update",
      action: "edit",
      component: "modal",
    },
    {
      title: "Step 6: Add One More Game",
      description:
        "Let's add Fortnite Battle Royale on PC to your collection. Search for it and add it!",
      action: "addFortnite",
      component: "search",
      targetGame: "fortnite",
    },
    {
      title: "Step 7: Delete Games",
      description:
        "You can remove games from your library anytime. Try deleting Fortnite by clicking the delete button.",
      action: "delete",
      component: "library",
      highlight: ".delete-button",
    },
    {
      title: "Ready to Get Started?",
      description:
        "You've seen all the key features! Create an account to save your game collection and access it from anywhere.",
      action: "complete",
      component: "complete",
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.removeItem("guidedTour_currentStep");
    localStorage.removeItem("guidedTour_demoGames");
    onComplete();
  };

  const handleGameClick = (game) => {
    setSelectedGame(game);
    setModalIsOpen(true);
  };

  const handleEditSubmit = (updatedGame) => {
    // Update the game in demo games
    setDemoGames(
      demoGames.map((g) => (g.id === updatedGame.id ? updatedGame : g)),
    );
    setEditMode(false);
    setEditingNote(null);
    // Auto-advance after editing on step 5 (index 5)
    if (currentStep === 5) {
      setTimeout(() => handleNext(), 500);
    }
  };

  const handleEditCancel = () => {
    setEditMode(false);
    setEditingNote(null);
  };

  const handleAddGame = (game) => {
    const currentAction = currentStepData.action;
    const gameName = game.name?.toLowerCase() || "";

    // Create a game object with proper structure
    const createGameEntry = (game, platformName) => {
      // Find the platform or create a fallback with guaranteed id
      let platform = game.platforms?.find((p) =>
        p.name?.toLowerCase().includes(platformName.toLowerCase()),
      );

      if (!platform) {
        platform = game.platforms?.[0];
      }

      if (!platform || !platform.id) {
        // Create a unique platform object with a guaranteed id
        const platformId =
          Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
        platform = {
          id: platformId,
          name: platformName,
        };
      }

      return {
        id: `demo-${Date.now()}-${Math.random()}`,
        name: game.name || "Unknown Game",
        selectedPlatform: platform,
        genre: game.genres?.[0]?.name || "Unknown",
        rating: 0,
        status: "Not Started",
        image: game.background_image || game.image || "",
        releaseDate: game.released || "",
        isWishlisted: false,
      };
    };

    // Check which step we're on and add the appropriate game
    if (currentAction === "addSonic" && gameName.includes("sonic")) {
      const newGame = createGameEntry(game, "Sega Mega Drive");
      setDemoGames([...demoGames, newGame]);
      setTimeout(() => handleNext(), 800);
    } else if (
      currentAction === "addBattlefield" &&
      gameName.includes("battlefield")
    ) {
      const newGame = createGameEntry(game, "PlayStation 5");
      setDemoGames([...demoGames, newGame]);
      setTimeout(() => handleNext(), 800);
    } else if (
      currentAction === "addMario" &&
      (gameName.includes("mario") || gameName.includes("odyssey"))
    ) {
      const newGame = createGameEntry(game, "Nintendo Switch");
      setDemoGames([...demoGames, newGame]);
      setTimeout(() => handleNext(), 800);
    } else if (
      currentAction === "addFortnite" &&
      gameName.includes("fortnite")
    ) {
      const newGame = createGameEntry(game, "PC");
      setDemoGames([...demoGames, newGame]);
      setTimeout(() => handleNext(), 800);
    }
  };

  const handleDeleteGame = (gameId) => {
    setDemoGames(demoGames.filter((g) => g.id !== gameId));
    setTimeout(() => {
      handleNext();
    }, 1000);
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!currentStepData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div
          className="h-1 bg-indigo-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 flex items-center justify-center flex-shrink-0">
              <GamingPlatformLogos mode="rotate" interval={2500} />
            </div>
            <span className="text-sm font-medium text-gray-900">
              Guided Tour: Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onComplete}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Close Preview
            </button>
            <button
              onClick={handleSkip}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Skip Tour & Sign Up
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-24">
        {/* Step Instructions */}
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-600">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentStepData.title}
            </h2>
            <p className="text-gray-600 text-lg">
              {currentStepData.description}
            </p>
          </div>
        </div>

        {/* Component Display */}
        <div className="max-w-7xl mx-auto px-4">
          {currentStepData.component === "welcome" && (
            <div className="text-center py-12">
              <div className="flex justify-center ml-4">
                <div className="h-24 w-24">
                  <GamingPlatformLogos mode="rotate" interval={1500} />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Game Library Manager
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                Organize your gaming collection, track what you're playing,
                create wishlists, and share your library with friends!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="font-semibold text-lg mb-2">Search Games</h3>
                  <p className="text-gray-600 text-sm">
                    Find games from our extensive database
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-4xl mb-4">📚</div>
                  <h3 className="font-semibold text-lg mb-2">Organize</h3>
                  <p className="text-gray-600 text-sm">
                    Track your collection with ratings and notes
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-4xl mb-4">🔗</div>
                  <h3 className="font-semibold text-lg mb-2">Share</h3>
                  <p className="text-gray-600 text-sm">
                    Share your library and wishlists with friends
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStepData.component === "search" && (
            <div className="search-container">
              <GameSearch
                onGameAdd={handleAddGame}
                isDemo={true}
                existingGames={demoGames}
                onToggleManualForm={() => {}}
                showManualForm={false}
                onUpdateMissingImages={() => {}}
                onUpdateMissingInformation={() => {}}
                hasGames={demoGames.length > 0}
                isUpdatingImages={false}
              />
              <GameForm
                show={editMode}
                editMode={editMode}
                editingNote={editingNote}
                onSubmit={handleEditSubmit}
                onCancel={handleEditCancel}
                userId="demo-user"
              />
            </div>
          )}

          {(currentStepData.component === "library" ||
            currentStepData.component === "modal") && (
            <>
              {demoGames.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="mx-auto h-16 w-16"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Games Added Yet
                  </h3>
                  <p className="text-gray-600">
                    Add games using the search feature to build your library!
                  </p>
                </div>
              ) : (
                <GameLibrary
                  notes={demoGames}
                  onEdit={(game) => {
                    setEditingNote(game);
                    setEditMode(true);
                    // Scroll to form
                    setTimeout(() => {
                      document
                        .getElementById("game-form")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}
                  onDelete={handleDeleteGame}
                  onViewInfo={handleGameClick}
                  onToggleWishlist={(game) => {
                    // Demo mode - just toggle locally
                    setDemoGames(
                      demoGames.map((g) =>
                        g.id === game.id
                          ? { ...g, isWishlisted: !g.isWishlisted }
                          : g,
                      ),
                    );
                  }}
                  isUpdatingImages={false}
                  deletingGameId={null}
                  isDemo={true}
                  highlightDelete={currentStepData.action === "delete"}
                />
              )}

              {modalIsOpen && selectedGame && (
                <GameModal
                  isOpen={modalIsOpen}
                  onClose={() => {
                    setModalIsOpen(false);
                    // Auto-advance after viewing game info on step 4 (index 4)
                    if (currentStep === 4) {
                      setTimeout(() => handleNext(), 500);
                    }
                  }}
                  gameData={selectedGame}
                />
              )}

              <GameForm
                show={editMode}
                editMode={editMode}
                editingNote={editingNote}
                onSubmit={handleEditSubmit}
                onCancel={handleEditCancel}
                userId="demo-user"
              />
            </>
          )}

          {currentStepData.component === "complete" && (
            <div className="text-center py-12">
              <div className="mb-8 flex justify-center">
                <div className="h-32 w-32">
                  <GamingPlatformLogos mode="all" />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                You're All Set! 🎉
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                Create your free account to start building your own game library
                and access these features:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
                <div className="bg-white rounded-lg shadow p-6 text-left">
                  <div className="text-2xl mb-2">✅</div>
                  <h3 className="font-semibold text-lg mb-2">
                    Track Your Collection
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Add unlimited games with ratings, notes, and custom statuses
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 text-left">
                  <div className="text-2xl mb-2">❤️</div>
                  <h3 className="font-semibold text-lg mb-2">
                    Create Wishlists
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Save games you want to buy and share your wishlist
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 text-left">
                  <div className="text-2xl mb-2">📤</div>
                  <h3 className="font-semibold text-lg mb-2">Export & Share</h3>
                  <p className="text-gray-600 text-sm">
                    Export to PDF/CSV or create shareable links
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 text-left">
                  <div className="text-2xl mb-2">☁️</div>
                  <h3 className="font-semibold text-lg mb-2">Cloud Sync</h3>
                  <p className="text-gray-600 text-sm">
                    Access your library from any device, anywhere
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`px-6 py-2 rounded-md font-medium transition ${
              currentStep === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Previous
          </button>

          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition ${
                  index === currentStep
                    ? "bg-indigo-600 w-8"
                    : index < currentStep
                      ? "bg-indigo-400"
                      : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition"
          >
            {currentStep === steps.length - 1 ? "Sign Up Now" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
