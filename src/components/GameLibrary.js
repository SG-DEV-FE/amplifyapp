import React from 'react';
import psLogo from '../ps-logo.svg';

const GameCard = ({ note, onViewInfo, onEdit, onDelete }) => {
  console.log('🖼️ Rendering note:', {
    name: note.name,
    imageUrl: note.image,
    hasImage: !!note.image
  });

  const handleImageError = (e) => {
    console.log('❌ Image failed to load for:', note.name, 'URL:', note.image);
    e.target.src = psLogo;
    e.target.onerror = null;
  };

  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully for:', note.name);
  };

  return (
    <div className="w-screen md:w-64 rounded mx-auto py-5">
      {note.image ? (
        <img 
          src={note.image} 
          alt={note.name} 
          className='w-screen md:w-64 h-64 object-cover rounded'
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <div className="w-screen md:w-64 h-64 bg-gray-300 rounded flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs">No Image</p>
          </div>
        </div>
      )}
      
      <h2 className='py-3 text-white'>{note.name}</h2>
      
      <div className="flex flex-wrap justify-center gap-2">
        <button 
          type="button" 
          className="px-4 py-2 bg-blue-500 text-white rounded-full shadow-sm hover:bg-blue-300 focus:ring-2 focus:ring-300"                  
          onClick={() => onViewInfo(note)}
        >
          View Info
        </button>
        <button 
          type="button" 
          className="px-4 py-2 bg-green-500 text-white rounded-full shadow-sm hover:bg-green-300 focus:ring-2 focus:ring-300"                  
          onClick={() => onEdit(note)}
        >
          Edit
        </button>
        <button 
          type="button" 
          className="px-4 py-2 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-300 focus:ring-2 focus:ring-300"                  
          onClick={() => onDelete(note)}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

const GameLibrary = ({ notes, onViewInfo, onEdit, onDelete }) => {
  if (notes.length === 0) {
    return (
      <div className="bg-black">
        <div className="container mx-auto py-16">
          <div className="text-center text-white">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium mb-2">No Games Yet</h3>
            <p className="text-gray-400">Search for games above to start building your library!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black">
      <div className="container mx-auto">        
        <div className="bg-black grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:content-start md:justify-start">
          {notes.map(note => (
            <GameCard
              key={note.id || note.name}
              note={note}
              onViewInfo={onViewInfo}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameLibrary;