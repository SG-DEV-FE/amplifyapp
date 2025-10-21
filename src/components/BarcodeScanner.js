import React, { useState, useRef, useEffect, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { isMobile } from "react-device-detect";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const RAWG_API_KEY = process.env.REACT_APP_RAWG_API_KEY || "";
const RAWG_BASE_URL = "https://api.rawg.io/api";

const BarcodeScanner = ({ onGameFound, onClose, onGameAdd }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const [searchingGame, setSearchingGame] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [addToWishlist, setAddToWishlist] = useState(false);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  const stopScanning = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
  }, []);

  const fallbackBarcodeSearch = useCallback(async (barcode) => {
    try {
      // Try searching RAWG directly with the barcode as a query
      // Some games might have their UPC in the description or metadata
      const response = await fetch(
        `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(
          barcode
        )}&page_size=5`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          // Return the first result if found
          return {
            name: data.results[0].name,
            barcode: barcode,
            rawgDirect: true,
          };
        }
      }

      return null;
    } catch (error) {
      console.error("Fallback barcode search error:", error);
      return null;
    }
  }, []);

  const searchGameByBarcode = useCallback(
    async (barcode) => {
      try {
        // First try UPCitemdb.com (free tier: 100 requests/day)
        let response = await fetch(
          `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`
        );

        if (response.ok) {
          const data = await response.json();

          if (data.code === "OK" && data.items && data.items.length > 0) {
            const item = data.items[0];
            const productName = item.title;
            const brand = item.brand;
            const category = item.category;

            // Check if it's likely a game based on category, brand, or title
            const gameKeywords = [
              "video game",
              "game",
              "gaming",
              "playstation",
              "xbox",
              "nintendo",
              "pc game",
              "software",
              "entertainment",
              "electronic",
              "computer game",
              "ps4",
              "ps5",
              "switch",
              "xbox one",
              "xbox series",
              "pc",
              "steam",
            ];

            const categoryLower = (category || "").toLowerCase();
            const brandLower = (brand || "").toLowerCase();
            const titleLower = (productName || "").toLowerCase();

            const isLikelyGame =
              gameKeywords.some(
                (keyword) =>
                  categoryLower.includes(keyword) ||
                  brandLower.includes(keyword) ||
                  titleLower.includes(keyword)
              ) ||
              categoryLower.includes("media") ||
              categoryLower.includes("software");

            if (productName && isLikelyGame) {
              return {
                name: productName,
                barcode: barcode,
                brand: brand,
                category: category,
                source: "upcitemdb",
              };
            }
          }
        }

        // Fallback: Try direct RAWG search with barcode
        return await fallbackBarcodeSearch(barcode);
      } catch (error) {
        console.error("Barcode search error:", error);
        // Try fallback on any error
        return await fallbackBarcodeSearch(barcode);
      }
    },
    [fallbackBarcodeSearch]
  );

  const searchRAWGByName = useCallback(async (gameName) => {
    try {
      const response = await fetch(
        `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(
          gameName
        )}&page_size=5`
      );

      if (!response.ok) {
        throw new Error("RAWG search failed");
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // Try to find exact match first
        const exactMatch = data.results.find(
          (game) => game.name.toLowerCase() === gameName.toLowerCase()
        );

        return exactMatch || data.results[0];
      }

      return null;
    } catch (error) {
      console.error("RAWG search error:", error);
      return null;
    }
  }, []);

  const handleBarcodeResult = useCallback(
    async (barcode) => {
      setIsScanning(false);
      setSearchingGame(true);
      stopScanning();

      try {
        // First, try to get game info from UPC database
        const gameInfo = await searchGameByBarcode(barcode);

        if (gameInfo) {
          // Search RAWG API with the game name
          const rawgGame = await searchRAWGByName(gameInfo.name);

          if (rawgGame) {
            const gameWithWishlist = {
              ...rawgGame,
              isWishlisted: addToWishlist,
            };
            onGameFound(gameWithWishlist);
            // Automatically add the game
            if (onGameAdd) {
              await onGameAdd(gameWithWishlist);
            }
          } else {
            setError(
              `Game "${gameInfo.name}" not found in RAWG database. Try manual search.`
            );
          }
        } else {
          setError(
            "Product not found or not a game. Try scanning another barcode."
          );
        }
      } catch (err) {
        console.error("Error processing barcode:", err);
        setError("Failed to process barcode. Please try again.");
      } finally {
        setSearchingGame(false);
      }
    },
    [
      stopScanning,
      searchGameByBarcode,
      searchRAWGByName,
      onGameFound,
      onGameAdd,
      addToWishlist,
    ]
  );

  useEffect(() => {
    const startScanningAsync = async () => {
      try {
        setError("");
        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        // Get video devices
        const videoInputDevices = await codeReader.listVideoInputDevices();

        if (videoInputDevices.length === 0) {
          throw new Error("No camera devices found");
        }

        // Use back camera if available (better for scanning)
        let selectedDeviceId = videoInputDevices[0].deviceId;
        const backCamera = videoInputDevices.find(
          (device) =>
            device.label.toLowerCase().includes("back") ||
            device.label.toLowerCase().includes("rear") ||
            device.label.toLowerCase().includes("environment")
        );

        if (backCamera) {
          selectedDeviceId = backCamera.deviceId;
        }

        // Start scanning
        await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              const code = result.getText();
              console.log("📱 Barcode scanned:", code);
              setScannedCode(code);
              handleBarcodeResult(code);
            }
            if (error && error.name !== "NotFoundException") {
              console.error("Scanning error:", error);
            }
          }
        );
      } catch (err) {
        console.error("Failed to start scanning:", err);
        setError(`Camera error: ${err.message}`);
        setIsScanning(false);
      }
    };

    if (isScanning) {
      startScanningAsync();
    }
    return () => {
      stopScanning();
    };
  }, [isScanning, handleBarcodeResult, stopScanning]);

  // Don't show on desktop
  if (!isMobile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 m-4 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan Game Barcode</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon="times" />
          </button>
        </div>

        {!isScanning && !searchingGame && (
          <div className="text-center">
            <div className="mb-4">
              <FontAwesomeIcon
                icon="search"
                className="text-6xl text-blue-500 mb-4"
              />
              <p className="text-gray-600 mb-4">
                Point your camera at a game's barcode to automatically add it to
                your library.
              </p>
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToWishlist}
                    onChange={(e) => setAddToWishlist(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 font-medium">
                    Add to wishlist instead of library
                  </span>
                  <svg
                    className="ml-2 w-4 h-4 text-red-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </label>
              </div>
              {scannedCode && (
                <p className="text-sm text-gray-500 mb-2">
                  Last scanned: {scannedCode}
                </p>
              )}
            </div>
            <button
              onClick={() => setIsScanning(true)}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              Start Scanning
            </button>
          </div>
        )}

        {isScanning && (
          <div className="text-center">
            <div className="relative bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                autoPlay
                playsInline
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-red-500 w-48 h-32 rounded-lg opacity-75"></div>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Position the barcode within the red frame
            </p>
            <button
              onClick={() => {
                setIsScanning(false);
                stopScanning();
              }}
              className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600"
            >
              Stop Scanning
            </button>
          </div>
        )}

        {searchingGame && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Searching for game...</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button
              onClick={() => {
                setError("");
                setScannedCode("");
              }}
              className="block w-full mt-2 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>📱 Barcode scanner works best with good lighting</p>
          <p>🎮 Supports UPC/EAN codes on game packaging</p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
