import React, { useState, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
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
  const [scanner, setScanner] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false); // Prevent multiple scans

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scanner) {
        try {
          if (scanner.getState() === 2) {
            scanner.stop().catch(() => {});
          }
          scanner.clear().catch(() => {});
        } catch (err) {
          console.log("Scanner cleanup:", err);
        }
      }
    };
  }, [scanner]);

  const searchGameByBarcode = async (barcode) => {
    try {
      // Try UPCitemdb.com
      const response = await fetch(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`
      );

      if (response.ok) {
        const data = await response.json();
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

          const isGame = gameKeywords.some(
            (keyword) =>
              (item.title || "").toLowerCase().includes(keyword) ||
              (item.category || "").toLowerCase().includes(keyword) ||
              (item.brand || "").toLowerCase().includes(keyword)
          );

          if (item.title && isGame) {
            return { name: item.title, barcode };
          }
        }
      }

      // Fallback: Try RAWG directly
      const rawgResponse = await fetch(
        `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(
          barcode
        )}&page_size=5`
      );

      if (rawgResponse.ok) {
        const data = await rawgResponse.json();
        if (data.results && data.results.length > 0) {
          return { name: data.results[0].name, barcode, rawgDirect: true };
        }
      }

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

  const handleBarcodeDetected = async (decodedText) => {
    // Prevent processing multiple barcodes at once
    if (isProcessing) {
      console.log("📱 Already processing a barcode, ignoring...");
      return;
    }

    console.log("📱 Barcode detected:", decodedText);
    setIsProcessing(true);
    setScannedCode(decodedText);

    // Stop scanning and show searching state
    await stopScanning();
    setSearchingGame(true);

    try {
      const gameInfo = await searchGameByBarcode(decodedText);

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
          // Close modal after successful add
          setTimeout(() => onClose(), 1000);
        } else {
          setError(
            `Game "${gameInfo.name}" not found in RAWG database. Try manual search.`
          );
          setSearchingGame(false);
          setIsProcessing(false);
        }
      } else {
        setError(
          "Product not found or not a game. Try scanning another barcode."
        );
        setSearchingGame(false);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Error processing barcode:", err);
      setError("Failed to process barcode. Please try again.");
      setSearchingGame(false);
      setIsProcessing(false);
    }
  };

  const startScanning = async () => {
    try {
      setError("");
      setIsScanning(true);

      // First, explicitly request camera permission to trigger browser prompt
      try {
        const permissionStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        // Stop the permission test stream immediately
        permissionStream.getTracks().forEach((track) => track.stop());
        console.log("📱 Camera permission granted");
      } catch (permErr) {
        console.error("Permission error:", permErr);
        throw new Error(
          "Camera permission denied. Please enable camera access in your browser settings and reload the page."
        );
      }

      const html5QrCode = new Html5Qrcode("barcode-reader");
      setScanner(html5QrCode);

      // Now get cameras - permission is already granted
      const devices = await Html5Qrcode.getCameras();

      if (!devices || devices.length === 0) {
        throw new Error("No cameras found on this device.");
      }

      console.log("📱 Available cameras:", devices.length);

      // Find back camera (environment facing)
      const backCamera = devices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear") ||
          device.label.toLowerCase().includes("environment")
      );

      const cameraId = backCamera ? backCamera.id : devices[0].id;
      console.log("📱 Using camera:", backCamera?.label || devices[0].label);

      // Start scanning with proper config
      await html5QrCode.start(
        cameraId,
        {
          fps: 10, // Scans per second
          qrbox: { width: 250, height: 150 }, // Scanning box size
          aspectRatio: 1.7777778, // 16:9 aspect ratio
        },
        handleBarcodeDetected,
        (errorMessage) => {
          // Ignore "not found" errors - just means no barcode in frame
          if (!errorMessage.includes("NotFoundException")) {
            console.log("Scan error:", errorMessage);
          }
        }
      );

      console.log("📱 Scanner started successfully");
    } catch (err) {
      console.error("Failed to start scanner:", err);
      setError(
        err.message ||
          "Failed to start camera. Please check permissions and try again."
      );
      setIsScanning(false);
      // Clean up scanner if it was created
      if (scanner) {
        scanner.stop().catch((e) => console.log("Cleanup error:", e));
        setScanner(null);
      }
    }
  };

  const stopScanning = async () => {
    console.log("📱 Stopping scanner...");
    try {
      if (scanner) {
        try {
          // Check if scanner is actually running
          if (scanner.getState() === 2) {
            // 2 = SCANNING state
            await scanner.stop();
            console.log("📱 Scanner stopped");
          }
        } catch (stopErr) {
          console.log("Stop error (may already be stopped):", stopErr);
        }

        try {
          await scanner.clear();
          console.log("📱 Scanner cleared");
        } catch (clearErr) {
          console.log("Clear error (may not need clearing):", clearErr);
        }

        setScanner(null);
      }

      setIsScanning(false);
      setIsProcessing(false);
      setSearchingGame(false);

      // Clear the scanner div content to prevent white screen
      const scannerElement = document.getElementById("barcode-reader");
      if (scannerElement) {
        scannerElement.innerHTML = "";
      }

      console.log("📱 Scanner cleanup complete");
    } catch (err) {
      console.log("Error stopping scanner:", err);
      setIsScanning(false);
      setIsProcessing(false);
      setSearchingGame(false);

      // Force clear the div anyway
      const scannerElement = document.getElementById("barcode-reader");
      if (scannerElement) {
        scannerElement.innerHTML = "";
      }
    }
  };

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
            onClick={() => {
              stopScanning().finally(() => {
                onClose();
              });
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
              id="barcode-reader"
              className="rounded-lg overflow-hidden mb-4"
            ></div>
            <p className="text-gray-600 mb-2">
              Position the barcode in the scanning area
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
            {error.includes("permission") && (
              <div className="text-xs mt-2 p-2 bg-white rounded border border-red-300">
                <p className="font-semibold mb-1">How to enable camera:</p>
                <p className="mb-1">
                  <strong>Firefox:</strong> Tap the lock icon → Permissions →
                  Camera → Allow
                </p>
                <p>
                  <strong>Chrome:</strong> Tap the lock icon → Site settings →
                  Camera → Allow
                </p>
              </div>
            )}
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
