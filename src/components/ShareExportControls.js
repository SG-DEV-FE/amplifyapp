import React, { useState } from "react";

const ShareExportControls = ({
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
      {/* Share and Export Controls */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap justify-center gap-4">
            {/* Share Library Button */}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
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
              Share Library ({totalGames} games)
            </button>

            {/* Export Wishlist Buttons */}
            {wishlistCount > 0 && (
              <>
                <button
                  onClick={onExportCSV}
                  className="flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-2"
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
                  Export Wishlist CSV ({wishlistCount} games)
                </button>

                <button
                  onClick={onExportPDF}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-2"
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
                  Export Wishlist PDF ({wishlistCount} games)
                </button>
              </>
            )}
          </div>
        </div>
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

export default ShareExportControls;