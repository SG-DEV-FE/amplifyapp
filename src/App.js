import { useEffect, useState } from 'react';
import './App.css';
import '@aws-amplify/ui-react/styles.css';
import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlusSquare, faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Modal from 'react-modal';
import psLogo from './ps-logo.svg'
import { supabase } from './index';


library.add(faPlusSquare, faChevronDown)
// Started off with a notes app from AWS tutorial and amended to required function
// Has authentication and option to login can be added using social media / google or amazon accounts

const initialFormState = { 
  name: '', 
  description: '',
  genre: '',
  releaseDate: '',
  players: '',
  publisher: '',
  image: '',
 }

export default function App() {
  
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  // const [isActive, setActive] = useState("false");
  const [modalIsOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState(false);
  useEffect(() => {
    fetchNotes();
  }, []);

  //  fecth tiles in library
  async function fetchNotes() {
  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching notes:', error);
    return;
  }
  
  // Handle image URLs if using Supabase Storage
  const notesWithImages = await Promise.all(notes.map(async (note) => {
    if (note.image) {
      const { data } = supabase.storage.from('images').getPublicUrl(note.image);
      note.image = data.publicUrl;
    }
    return note;
  }));
  
  setNotes(notesWithImages);
  }

  // Create a tile function
  async function createNote() {
    if (!formData.name || !formData.description) return;
  
  const { data, error } = await supabase
    .from('notes')
    .insert([
      {
        name: formData.name,
        description: formData.description,
        genre: formData.genre,
        release_date: formData.releaseDate,
        players: parseInt(formData.players),
        publisher: formData.publisher,
        image: formData.image
      }
    ])
    .select();
    
  if (error) {
    console.error('Error creating note:', error);
    return;
  }
  
  setNotes([...notes, data[0]]);
  setFormData(initialFormState);
  }

  // Delete function - removes a tile
  // async function deleteNote({ id }) {
  //   const newNotesArray = notes.filter(note => note.id !== id);
  //   setNotes(newNotesArray);
  //   await API.graphql({ query: deleteNoteMutation, variables: { input: { id } }});
  // }

  // Image upload function
  async function onChange(e) {
    if (!e.target.files[0]) return;
  
  const file = e.target.files[0];
  const fileName = `${Date.now()}-${file.name}`;
  
  const { error } = await supabase.storage
    .from('images')
    .upload(fileName, file);
    
  if (error) {
    console.error('Error uploading file:', error);
    return;
  }
  
  setFormData({ ...formData, image: fileName });
  fetchNotes();
  }

  // Modal function

  function openModal() {
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

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

  function noImage(ev) {
    ev.target.src = {psLogo};
    ev.target.onerror = null;
  };



  return (
    // <Authenticator>
    //   {({ signOut, user }) => (
        <>
    
      {/* Navigation */}
      <nav className="bg-white-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-5">
              <div className="flex-shrink-0">
                <a className="h-8 w-8" href="https://www.playstation.com" aria-label="PlayStation.com">
                  <svg class="shared-nav-ps-logo" width="50px" height="50px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
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
              <div class="hidden md:flex items-center space-x-2">
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {/* Sign out button removed - no auth required */}
                </div>
              </div>
            </div>
            <div className="-mr-2 flex md:hidden">
              {/* Sign out button removed - no auth required */}
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className='App'>
        {/* main intro */}
          <div className='container flex justify-center align-center flex-col py-8 mx-auto'>
            <h1 className='text-2xl text-slate-800'>Welcome to your game libray</h1>
            <p className='text-blue-500 uppercase tracking-widest'>play has no limits</p>

            <p className='pt-8'>
              You can create a library of your games here.
              <br />
              you will need to ensure that you have the images available to upload.
            </p>
          </div>

          <div className="bg-black">
            <div className="container mx-auto">        
              <div className="bg-black grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:content-start md:justify-start">
                {
                notes.map(note => (
                  <div key={note.id || note.name} className="w-screen md:w-64 rounded mx-auto py-5">
                    {
                      note.image && <img src={note.image} onError={noImage} alt={note.name} className='w-screen md:w-64 h-64 object-cover rounded' />
                    }
                    <h2 className='py-3 text-white'>{note.name}</h2>
                    <button 
                      type="button" 
                      class="m-2 px-6 py-2 bg-blue-500 text-white rounded-full shadow-sm hover:bg-blue-300 focus:ring-2 focus:ring-300"                  
                      onClick={() => {
                        openModal();
                        setModalData(note);
                      }}
                    >
                      view game info
                    </button>                    
                    {/* <button onClick={() => deleteNote(note)}>Delete note</button> */}
                  </div>
                ))
              }
              </div>
            </div>
          </div>          
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          style={customStyles}
          contentLabel="Game Information"
          
        >             
          <div className="py-4 px-4 bg-white">
            <h2 className="text-lg font-semibold text-slate-800">{modalData.name}</h2>
            <p className="mt-4 font-semibold text-slate-800">Supported Platform: <span className="font-thin text-slate">{modalData.description}</span></p>
            <p className="mt-2 font-semibold text-slate-600">Genre: <span className="font-thin text-slate-400">{modalData.genre}</span></p>
            <p className="mt-2 font-semibold text-slate-600">Release Date: <span className="font-thin text-slate-400">{new Date(modalData.releaseDate).toLocaleDateString()}</span></p>
            <p className="mt-2 font-semibold text-slate-600">Number of players: <span className="font-thin text-slate-400">{modalData.players}</span></p>
            <p className="mt-2 font-semibold text-slate-600">Publisher: <span className="font-thin text-slate-400">{modalData.publisher}</span></p>
          </div>                                    

          <div class="flex justify-end pt-2">          
            <button onClick={closeModal} class="modal-close px-4 bg-blue-500 p-3 rounded-lg text-white hover:bg-blue-400">Close</button>
          </div>
        
        </Modal>



          <div className='container mx-auto py-12'>
            <p className='text-center'><FontAwesomeIcon className='text-blue-500' icon="plus-square"/> Add a game to your library using the form below</p>
          </div>
          <div className='flex justify-center items-center mx-auto py-8'>
          
          <div class="md:grid md:grid-cols-12 md:gap-6 w-full md:w-2/4 drop-shadow-lg">
            <div class="mt-5 md:mt-0 md:col-span-12">          
                <div class="shadow sm:rounded-md sm:overflow-hidden">
                  <div class="px-4 py-5 bg-white space-y-6 sm:p-6">
                    <div class="grid grid-cols-12 gap-6">

                            {/* Game Title */}

                            <div class="col-span-6">
                              <label for="title-name" class="block text-sm text-left font-medium text-gray-700 py-4">
                                Game / Title name
                              </label>
                              <div class="mt-1 flex rounded-md shadow-sm">
                                <input 
                                  type="text"
                                  onChange={e => setFormData({ ...formData, 'name': e.target.value })}
                                  placeholder='Title Name'
                                  value={formData.name}
                                  name="title-name"
                                  id="title-name"
                                  className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                                />
                              </div>
                            </div>

                            {/* System Platform */}

                            <div class="col-span-6">
                            <label for="title-name" class="block text-sm text-left font-medium text-gray-700 py-4">
                                System / Platform
                              </label>
                              <div class="mt-1 flex rounded-md shadow-sm">
                                <input 
                                  type="text"
                                  onChange={e => setFormData({...formData, 'description': e.target.value})}
                                  placeholder='System Platform'
                                  value={formData.description}
                                  name="system-platform"
                                  id="system-platform"
                                  className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                                />
                              </div>
                            </div>
                            
                            {/* Title Genre */}

                            <div class="col-span-6">
                            <label for="title-name" class="block text-sm text-left font-medium text-gray-700 py-4">
                                Title Genre
                              </label>
                              <div class="mt-1 flex rounded-md shadow-sm">
                                <input 
                                  type="text"
                                  onChange={e => setFormData({...formData, 'genre': e.target.value})}
                                  placeholder='Title Genre'
                                  value={formData.genre}
                                  name="title-genre"
                                  id="title-genre"
                                  className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                                />
                              </div>
                            </div>
                                                      
                            {/* Release Date */}

                            <div class="col-span-6">
                            <label for="title-name" class="block text-sm text-left font-medium text-gray-700 py-4">
                                Release Date
                              </label>
                              <div class="mt-1 flex rounded-md shadow-sm">
                                <input 
                                  type="date" 
                                  onChange={e => setFormData({...formData, 'releaseDate': e.target.value})}
                                  placeholder='Release Date'
                                  value={formData.releaseDate}
                                  name="release-date"
                                  id="release-date"
                                  className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2 cursor-pointer"
                                />
                              </div>
                            </div>
                                                      
                            {/* Number of Players */}

                            <div class="col-span-6">
                            <label for="title-name" class="block text-sm text-left font-medium text-gray-700 py-4">
                                Number of Players
                              </label>
                              <div class="mt-1 flex rounded-md shadow-sm">
                              <input 
                                  type="number"
                                  onChange={e => setFormData({...formData, 'players': e.target.value})}
                                  placeholder='No. of players'
                                  value={formData.players}
                                  name="player-count"
                                  id="player-count"
                                  className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                                />
                              </div>
                            </div>
                                                                                
                            {/* Publisher */}

                            <div class="col-span-6">
                            <label for="title-name" class="block text-sm text-left font-medium text-gray-700 py-4">
                                Publisher
                              </label>
                              <div class="mt-1 flex rounded-md shadow-sm">
                              <input 
                                  type="text"
                                  onChange={e => setFormData({...formData, 'publisher': e.target.value})}
                                  placeholder='Publisher'
                                  value={formData.publisher}
                                  name="publisher"
                                  id="publisher"
                                  className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                                />
                              </div>
                            </div>

                            {/* Image upload */}

                            <div className='col-span-12'>
                            <label for="title-name" class="block text-sm text-left font-medium text-gray-700 py-4">
                                Game / Title box art
                              </label>
                              <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                <div class="space-y-1 text-left">
                                  <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                  </svg>
                                  <div class="flex justify-center text-sm text-gray-600">
                                    <label for="file-upload" class="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                      <span>Upload a file</span>
                                      <input
                                      type="file"
                                      onChange={onChange}
                                      id="file-upload" 
                                      name="file-upload" 
                                      className="sr-only" />
                                    </label>
                                  </div>
                                  <p class="text-xs text-gray-500">
                                    PNG, JPG, GIF up to 10MB
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="px-4 py-3 bg-gray-50 text-right sm:px-6">
                          <button onClick={createNote} class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Create Game
                          </button>
                          
                        </div>
                      </div>
                  </div>
                </div>
              </div> 
        </div>
        
      </main>
     </>
    //   )}
    // </Authenticator>
  );
}
