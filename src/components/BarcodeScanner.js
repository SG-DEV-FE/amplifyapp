import React, { useState, useEffect, useRef } from "react";
import Quagga from "@ericblade/quagga2";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef(null);

  const searchGameByBarcode = async (barcode) => {
    console.log("🔍 Searching for barcode:", barcode);

    try {
      // Try UPC database first
      const response = await fetch(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("📦 UPC Database response:", data);

        if (data.code === "OK" && data.items && data.items.length > 0) {
          const item = data.items[0];
          const gameKeywords = [
            "video game",
            "game",
            "gaming",
            "playstation",
            "xbox",
            "nintendo",
            "pc game",
            "software",
            "ps4",
            "ps5",
            "switch",
          ];

          // Check if it's likely a game product
          const isGame = gameKeywords.some(
            (keyword) =>
              (item.title || "").toLowerCase().includes(keyword) ||
              (item.category || "").toLowerCase().includes(keyword) ||
              (item.brand || "").toLowerCase().includes(keyword)
          );

          if (item.title) {
            // Clean up the title - remove platform info in parentheses for better RAWG search
            const cleanTitle = item.title
              .replace(/\s*\([^)]*\)\s*/g, " ")
              .trim();

            if (isGame) {
              console.log(
                "✅ Game found in UPC DB:",
                cleanTitle,
                "| Original:",
                item.title
              );
            } else {
              console.log(
                "⚠️ Product found but may not be a game:",
                cleanTitle
              );
            }

            return {
              name: cleanTitle,
              originalName: item.title,
              barcode,
              isGame,
            };
          }
        } else {
          console.log("❌ UPC Database: No items found or invalid response");
        }
      } else {
        console.log("❌ UPC Database API error:", response.status);
      }

      // If UPC lookup fails, try searching RAWG directly with the barcode
      // Some games might be searchable by UPC in RAWG
      console.log("🎮 Trying RAWG direct search with barcode...");
      const rawgResponse = await fetch(
        `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(
          barcode
        )}&page_size=5`
      );

      if (rawgResponse.ok) {
        const data = await rawgResponse.json();
        if (data.results && data.results.length > 0) {
          console.log("✅ Found in RAWG by barcode:", data.results[0].name);
          return { name: data.results[0].name, barcode, rawgDirect: true };
        }
      }

      console.log("❌ No game found for barcode:", barcode);
      return null;
    } catch (error) {
      console.error("Barcode search error:", error);
      return null;
    }
  };

  const searchRAWGByName = async (gameName) => {
    try {
      const response = await fetch(
        `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(
          gameName
        )}&page_size=5`
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (data.results && data.results.length > 0) {
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
  };

  const handleDetected = async (result) => {
    if (isProcessing || !result || !result.codeResult) return;

    const code = result.codeResult.code;

    // Validate the barcode (should be numeric and reasonable length)
    // Video game barcodes are typically 12-13 digits (UPC-A/EAN-13)
    if (!code || !/^\d+$/.test(code) || code.length < 8 || code.length > 14) {
      console.log("❌ Invalid barcode format:", code, "Length:", code?.length);
      return;
    }

    console.log("✅ Valid barcode detected:", code, "Length:", code.length);
    setIsProcessing(true);
    setScannedCode(code);
    setSearchingGame(true);

    // Stop scanner
    stopScanning();

    try {
      const gameInfo = await searchGameByBarcode(code);

      if (gameInfo) {
        const rawgGame = await searchRAWGByName(gameInfo.name);

        if (rawgGame) {
          const gameWithWishlist = {
            ...rawgGame,
            isWishlisted: addToWishlist,
          };
          onGameFound(gameWithWishlist);
          if (onGameAdd) {
            await onGameAdd(gameWithWishlist);
          }
          setTimeout(() => onClose(), 1000);
        } else {
          setError(
            `Found "${gameInfo.name}" from barcode but couldn't locate it in our game database. Please use the manual search function above to find and add your game.`
          );
          setSearchingGame(false);
          setIsProcessing(false);
        }
      } else {
        setError(
          `Barcode ${code} not found in our video game databases. Unfortunately, not all game barcodes are indexed. Please use the manual search function above to find and add your game.`
        );
        setSearchingGame(false);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Error processing barcode:", err);
      setError(
        `Failed to process barcode ${code}. Please try again or use manual search.`
      );
      setSearchingGame(false);
      setIsProcessing(false);
    }
  };

  const startScanning = async () => {
    setError("");
    setIsScanning(true);

    // Wait for the next render cycle so the ref is attached
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Now check if the scanner ref exists
    if (!scannerRef.current) {
      setError("Scanner element not ready. Please try again.");
      setIsScanning(false);
      return;
    }

    try {
      // Initialize Quagga with proper configuration
      await new Promise((resolve, reject) => {
        Quagga.init(
          {
            inputStream: {
              type: "LiveStream",
              target: scannerRef.current,
              constraints: {
                facingMode: "environment",
                width: { min: 640, ideal: 1920, max: 1920 },
                height: { min: 480, ideal: 1080, max: 1080 },
              },
            },
            decoder: {
              readers: [
                "ean_reader", // EAN-13, EAN-8 (most common for games)
                "ean_8_reader",
                "upc_reader", // UPC-A, UPC-E
                "upc_e_reader",
              ],
              debug: {
                drawBoundingBox: true,
                showFrequency: true,
                drawScanline: true,
                showPattern: true,
              },
            },
            locate: true,
            locator: {
              patchSize: "large", // Changed from medium to large for better detection
              halfSample: false, // Changed to false for better quality
            },
            numOfWorkers: navigator.hardwareConcurrency || 4,
            frequency: 10,
          },
          (err) => {
            if (err) {
              console.error("Quagga initialization error:", err);
              reject(err);
              return;
            }
            resolve();
          }
        );
      });

      // Start scanning after successful initialization
      Quagga.start();

      // Add processing callback for debugging
      Quagga.onProcessed((result) => {
        if (result) {
          if (result.boxes) {
            // Draw detection boxes on canvas for visual feedback
            const drawingCtx = Quagga.canvas.ctx.overlay;
            const drawingCanvas = Quagga.canvas.dom.overlay;

            if (drawingCtx && drawingCanvas) {
              drawingCtx.clearRect(
                0,
                0,
                drawingCanvas.width,
                drawingCanvas.height
              );
            }
          }
          if (result.codeResult) {
            console.log("Code detected (processing):", result.codeResult.code);
          }
        }
      });

      // Attach detection handler
      Quagga.onDetected(handleDetected);
    } catch (err) {
      console.error("Failed to start scanner:", err);
      setError(
        "Failed to start camera. Please check camera permissions and try again."
      );
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    try {
      Quagga.stop();
      Quagga.offDetected(handleDetected);
      Quagga.offProcessed();
      setIsScanning(false);
      setIsProcessing(false);
      setSearchingGame(false);
    } catch (err) {
      setIsScanning(false);
      setIsProcessing(false);
      setSearchingGame(false);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      try {
        if (isScanning) {
          Quagga.stop();
        }
        Quagga.offDetected(handleDetected);
      } catch (err) {
        // Already stopped
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  if (!isMobile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 m-4 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan Game Barcode</h3>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon="times" />
          </button>
        </div>

        {!isScanning && !searchingGame && (
          <div className="text-center">
            <div className="mb-4">
              <FontAwesomeIcon
                icon="camera"
                className="text-6xl text-blue-500 mb-4"
              />
              <p className="text-gray-600 mb-2">
                Point your camera at a game's barcode to automatically add it to
                your library.
              </p>
              <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-gray-600">
                <p className="font-semibold mb-1">
                  📷 Camera Permission Required
                </p>
                <p>
                  You'll be asked to allow camera access when you tap "Start
                  Scanning"
                </p>
              </div>
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
              onClick={startScanning}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2"
            >
              Start Scanning
            </button>
            <p className="text-xs text-gray-500 mt-2">
              💡 Make sure to allow camera access when prompted by your browser
            </p>
          </div>
        )}

        {isScanning && (
          <div className="text-center">
            <div
              ref={scannerRef}
              id="barcode-scanner"
              className="rounded-lg overflow-hidden mb-4 relative"
              style={{
                width: "100%",
                height: "300px",
                backgroundColor: "#000",
              }}
            >
              {/* Scanning overlay box */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ zIndex: 1 }}
              >
                <div
                  className="border-2 border-green-500"
                  style={{
                    width: "80%",
                    height: "40%",
                    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400"></div>
                </div>
              </div>
            </div>
            <p className="text-gray-600 mb-2 font-medium">
              Position the barcode in the green scanning area
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Hold steady and ensure good lighting
            </p>
            <button
              onClick={stopScanning}
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
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            <p className="font-semibold mb-2">⚠️ {error}</p>
            <button
              onClick={() => {
                setError("");
                setScannedCode("");
                setIsProcessing(false);
              }}
              className="block w-full mt-2 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>📱 Works best with good lighting</p>
          <p>🎮 Supports UPC/EAN codes on game packaging</p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
