import React, { useState } from "react";

const NavActionButtons = ({
  onShare,
  onExportCSV,
  onExportPDF,
  wishlistCount,
  totalGames
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [isCreatingShare, setIsCreatingShare] = useState(false);

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

  return (
    <>
      <div className="flex items-center space-x-2 mr-4">
        {/* Share Library Icon */}
        <button
          onClick={() => setShowShareModal(true)}
          title={`Share Library (${totalGames} games)`}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
            />
          </svg>
        </button>

        {/* Export CSV Icon */}
        {wishlistCount > 0 && (
          <button
            onClick={onExportCSV}
            title={`Export Wishlist CSV (${wishlistCount} games)`}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>
        )}

        {/* Export PDF Icon */}
        {wishlistCount > 0 && (
          <button
            onClick={onExportPDF}
            title={`Export Wishlist PDF (${wishlistCount} games)`}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
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
                ℹ️ Only your game library will be shared (not your wishlist). The link will be public but not searchable.
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
    </>
  );
};

export default NavActionButtons;