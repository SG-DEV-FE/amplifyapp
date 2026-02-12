import React, { useState } from "react";
import { Share2, HeartPulse, FileDown, File } from "lucide-react";

const NavActionButtons = ({
  onShare,
  onShareWishlist,
  onExportCSV,
  onExportPDF,
  wishlistCount,
  totalGames,
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showWishlistShareModal, setShowWishlistShareModal] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [wishlistOwnerName, setWishlistOwnerName] = useState("");
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [isCreatingWishlistShare, setIsCreatingWishlistShare] = useState(false);

  const handleCreateShare = async () => {
    if (!ownerName.trim()) {
      alert("Please enter your name for the shared library.");
      return;
    }

    setIsCreatingShare(true);
    try {
      await onShare(ownerName.trim());
      setShowShareModal(false);
      setOwnerName("");
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handleCreateWishlistShare = async () => {
    if (!wishlistOwnerName.trim()) {
      alert("Please enter your name for the shared wishlist.");
      return;
    }

    if (wishlistCount === 0) {
      alert("You don't have any items in your wishlist to share.");
      return;
    }

    setIsCreatingWishlistShare(true);
    try {
      await onShareWishlist(wishlistOwnerName.trim());
      setShowWishlistShareModal(false);
      setWishlistOwnerName("");
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsCreatingWishlistShare(false);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2 mr-4">
        {/* Share Library Icon */}
        <button
          onClick={() => setShowShareModal(true)}
          title={`Share Library (${totalGames} games)`}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xs transition-colors"
        >
          <Share2 className="w-5 h-5" />
        </button>

        {/* Share Wishlist Icon */}
        {wishlistCount > 0 && (
          <button
            onClick={() => setShowWishlistShareModal(true)}
            title={`Share Wishlist (${wishlistCount} games)`}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xs transition-colors"
          >
            <HeartPulse className="w-5 h-5" />
          </button>
        )}

        {/* Export CSV Icon */}
        {wishlistCount > 0 && (
          <button
            onClick={onExportCSV}
            title={`Export Wishlist CSV (${wishlistCount} games)`}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xs transition-colors"
          >
            <FileDown className="w-5 h-5" />
          </button>
        )}

        {/* Export PDF Icon */}
        {wishlistCount > 0 && (
          <button
            onClick={onExportPDF}
            title={`Export Wishlist PDF (${wishlistCount} games)`}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xs transition-colors"
          >
            <File className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xs shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Share Your Game Library
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Create a public, read-only link to share your game collection
              </p>
            </div>

            <div className="px-6 py-4">
              <label
                htmlFor="ownerName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your name (will appear on the shared library):
              </label>
              <input
                type="text"
                id="ownerName"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === "Enter" && handleCreateShare()}
              />
              <p className="text-xs text-gray-500 mt-2">
                ℹ️ Your complete game collection (library + wishlist) will be
                shared. Use the ❤️ button to share only your wishlist.
              </p>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setOwnerName("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateShare}
                disabled={isCreatingShare || !ownerName.trim()}
                className={`px-4 py-2 text-sm font-medium rounded-md focus:ring-2 focus:outline-none ${
                  isCreatingShare || !ownerName.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                }`}
              >
                {isCreatingShare ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  "Create Share Link"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wishlist Share Modal */}
      {showWishlistShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xs shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                ❤️ Share Your Wishlist
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Create a public, read-only link to share your game wishlist
              </p>
            </div>

            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your name (will appear on the shared wishlist):
              </label>
              <input
                type="text"
                value={wishlistOwnerName}
                onChange={(e) => setWishlistOwnerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                placeholder="Enter your name"
                onKeyPress={(e) =>
                  e.key === "Enter" && handleCreateWishlistShare()
                }
              />
              <p className="text-xs text-gray-500 mt-2">
                ℹ️ Only your wishlist items will be shared ({wishlistCount}{" "}
                games). The link will be public but not searchable.
              </p>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
              <button
                onClick={() => {
                  setShowWishlistShareModal(false);
                  setWishlistOwnerName("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWishlistShare}
                disabled={isCreatingWishlistShare || !wishlistOwnerName.trim()}
                className={`px-4 py-2 text-sm font-medium rounded-md focus:ring-2 focus:outline-none ${
                  isCreatingWishlistShare || !wishlistOwnerName.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                }`}
              >
                {isCreatingWishlistShare ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  "Create Wishlist Link"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NavActionButtons;
