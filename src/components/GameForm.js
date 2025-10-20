import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const initialFormState = {
  name: "",
  description: "",
  genre: "",
  releaseDate: "",
  players: "",
  publisher: "",
  image: "",
};

const GameForm = ({
  show,
  editMode,
  editingNote,
  onSubmit,
  onCancel,
  userId,
}) => {
  const [formData, setFormData] = useState(initialFormState);
  const [newImageUploaded, setNewImageUploaded] = useState(false);

  // Update form data when editing
  useEffect(() => {
    if (editMode && editingNote) {
      const imageFileName =
        editingNote.image && editingNote.image.includes("/")
          ? editingNote.image.split("/").pop()
          : editingNote.image;

      setFormData({
        name: editingNote.name,
        description: editingNote.description,
        genre: editingNote.genre || "",
        releaseDate: editingNote.release_date || "",
        players: editingNote.players || "",
        publisher: editingNote.publisher || "",
        image: imageFileName || "",
      });
      setNewImageUploaded(false);
    } else {
      setFormData(initialFormState);
      setNewImageUploaded(false);
    }
  }, [editMode, editingNote]);

  // Image upload function
  const handleImageUpload = async (e) => {
    if (!e.target.files[0]) return;

    const file = e.target.files[0];

    // Sanitize filename by removing special characters and spaces
    const sanitizedName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_");

    const fileName = `${Date.now()}-${sanitizedName}`;

    console.log("Original filename:", file.name);
    console.log("Sanitized filename:", fileName, "in edit mode:", editMode);

    try {
      // Upload to Netlify Functions
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filename", fileName);

      const token = localStorage.getItem("netlifyToken");
      const userId = localStorage.getItem("userId");

      const response = await fetch("/api/images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": userId,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();
      console.log("File uploaded successfully:", result.filename);

      setFormData({ ...formData, image: result.filename });
      if (editMode) {
        setNewImageUploaded(true);
        console.log("New image uploaded during edit");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(`Upload error: ${error.message}`);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description) {
      alert("Please fill in the game name and platform/description.");
      return;
    }

    await onSubmit(formData, newImageUploaded);
    setFormData(initialFormState);
    setNewImageUploaded(false);
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setNewImageUploaded(false);
    onCancel();
  };

  if (!show) return null;

  return (
    <>
      <div className="container mx-auto py-12">
        <p className="text-center">
          <FontAwesomeIcon className="text-blue-500" icon="plus-square" />
          {editMode
            ? " Edit your game using the form below"
            : " Add a game manually using the form below"}
        </p>
      </div>

      <div className="flex justify-center items-center mx-auto py-8">
        <div
          id="game-form"
          className="md:grid md:grid-cols-12 md:gap-6 w-full md:w-2/4 drop-shadow-lg"
        >
          <div className="mt-5 md:mt-0 md:col-span-12">
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                <div className="grid grid-cols-12 gap-6">
                  {/* Game Title */}
                  <div className="col-span-6">
                    <label
                      htmlFor="title-name"
                      className="block text-sm text-left font-medium text-gray-700 py-4"
                    >
                      Game / Title name
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Title Name"
                        value={formData.name}
                        name="title-name"
                        id="title-name"
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                      />
                    </div>
                  </div>

                  {/* System Platform */}
                  <div className="col-span-6">
                    <label
                      htmlFor="system-platform"
                      className="block text-sm text-left font-medium text-gray-700 py-4"
                    >
                      System / Platform
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="System Platform"
                        value={formData.description}
                        name="system-platform"
                        id="system-platform"
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                      />
                    </div>
                  </div>

                  {/* Title Genre */}
                  <div className="col-span-6">
                    <label
                      htmlFor="title-genre"
                      className="block text-sm text-left font-medium text-gray-700 py-4"
                    >
                      Title Genre
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        onChange={(e) =>
                          setFormData({ ...formData, genre: e.target.value })
                        }
                        placeholder="Title Genre"
                        value={formData.genre}
                        name="title-genre"
                        id="title-genre"
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                      />
                    </div>
                  </div>

                  {/* Release Date */}
                  <div className="col-span-6">
                    <label
                      htmlFor="release-date"
                      className="block text-sm text-left font-medium text-gray-700 py-4"
                    >
                      Release Date
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="date"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            releaseDate: e.target.value,
                          })
                        }
                        placeholder="Release Date"
                        value={formData.releaseDate}
                        name="release-date"
                        id="release-date"
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Number of Players */}
                  <div className="col-span-6">
                    <label
                      htmlFor="player-count"
                      className="block text-sm text-left font-medium text-gray-700 py-4"
                    >
                      Number of Players
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="number"
                        onChange={(e) =>
                          setFormData({ ...formData, players: e.target.value })
                        }
                        placeholder="No. of players"
                        value={formData.players}
                        name="player-count"
                        id="player-count"
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                      />
                    </div>
                  </div>

                  {/* Publisher */}
                  <div className="col-span-6">
                    <label
                      htmlFor="publisher"
                      className="block text-sm text-left font-medium text-gray-700 py-4"
                    >
                      Publisher
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            publisher: e.target.value,
                          })
                        }
                        placeholder="Publisher"
                        value={formData.publisher}
                        name="publisher"
                        id="publisher"
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 py-2 px-2"
                      />
                    </div>
                  </div>

                  {/* Image upload */}
                  <div className="col-span-12">
                    <label
                      htmlFor="file-upload"
                      className="block text-sm text-left font-medium text-gray-700 py-4"
                    >
                      Game / Title box art
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-left">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex justify-center text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                          >
                            <span>Upload a file</span>
                            <input
                              type="file"
                              onChange={handleImageUpload}
                              id="file-upload"
                              name="file-upload"
                              className="sr-only"
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 space-x-2">
                {editMode ? (
                  <>
                    <button
                      onClick={handleSubmit}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Update Game
                    </button>
                    <button
                      onClick={handleCancel}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Create Game
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GameForm;
