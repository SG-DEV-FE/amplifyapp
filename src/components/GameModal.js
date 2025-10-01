import React from 'react';
import Modal from 'react-modal';

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
  },
};

const GameModal = ({ isOpen, onClose, gameData }) => {
  if (!gameData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel="Game Information"
    >             
      <div className="py-4 px-4 bg-white">
        <h2 className="text-lg font-semibold text-slate-800">{gameData.name}</h2>
        <p className="mt-4 font-semibold text-slate-800">
          Supported Platform: <span className="font-thin text-slate">{gameData.description}</span>
        </p>
        <p className="mt-2 font-semibold text-slate-600">
          Genre: <span className="font-thin text-slate-400">{gameData.genre}</span>
        </p>
        <p className="mt-2 font-semibold text-slate-600">
          Release Date: <span className="font-thin text-slate-400">
            {gameData.release_date && new Date(gameData.release_date).toLocaleDateString()}
          </span>
        </p>
        <p className="mt-2 font-semibold text-slate-600">
          Number of players: <span className="font-thin text-slate-400">{gameData.players}</span>
        </p>
        <p className="mt-2 font-semibold text-slate-600">
          Publisher: <span className="font-thin text-slate-400">{gameData.publisher}</span>
        </p>
      </div>                                    

      <div className="flex justify-end pt-2">          
        <button 
          onClick={onClose} 
          className="modal-close px-4 bg-blue-500 p-3 rounded-lg text-white hover:bg-blue-400"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

export default GameModal;