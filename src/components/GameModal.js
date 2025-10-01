import React, { useEffect } from 'react';

const GameModal = ({ isOpen, onClose, gameData }) => {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc, false);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc, false);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !gameData) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal container */}
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Close button */}
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal content */}
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-4" id="modal-title">
                {gameData.name}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-gray-700">Platform: </span>
                  <span className="text-gray-600">{gameData.description}</span>
                </div>
                
                {gameData.genre && (
                  <div>
                    <span className="font-semibold text-gray-700">Genre: </span>
                    <span className="text-gray-600">{gameData.genre}</span>
                  </div>
                )}
                
                {gameData.release_date && (
                  <div>
                    <span className="font-semibold text-gray-700">Release Date: </span>
                    <span className="text-gray-600">
                      {new Date(gameData.release_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {gameData.players && (
                  <div>
                    <span className="font-semibold text-gray-700">Players: </span>
                    <span className="text-gray-600">{gameData.players}</span>
                  </div>
                )}
                
                {gameData.publisher && (
                  <div>
                    <span className="font-semibold text-gray-700">Publisher: </span>
                    <span className="text-gray-600">{gameData.publisher}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal actions */}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameModal;