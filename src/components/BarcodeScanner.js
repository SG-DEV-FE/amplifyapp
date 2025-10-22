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
    try {
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

  const handleDetected = async (result) => {
    if (isProcessing || !result || !result.codeResult) return;

    const code = result.codeResult.code;
    console.log("📱 Barcode detected:", code);

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

  const startScanning = () => {
    setError("");
    setIsScanning(true);

    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            facingMode: "environment",
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
          },
        },
        decoder: {
          readers: [
            "ean_reader", // EAN-13, EAN-8
            "upc_reader", // UPC-A, UPC-E
            "code_128_reader", // Code 128
            "code_39_reader", // Code 39
          ],
          multiple: false,
        },
        locate: true,
        locator: {
          patchSize: "medium",
          halfSample: true,
        },
        numOfWorkers: 2,
        frequency: 10,
      },
      (err) => {
        if (err) {
          console.error("Quagga init error:", err);
          setError("Failed to start camera. Please check permissions.");
          setIsScanning(false);
          return;
        }
        console.log("📱 Scanner started successfully");
        Quagga.start();
      }
    );

    Quagga.onDetected(handleDetected);
  };

  const stopScanning = () => {
    console.log("📱 Stopping scanner...");
    try {
      Quagga.stop();
      Quagga.offDetected(handleDetected);
      setIsScanning(false);
      setIsProcessing(false);
      setSearchingGame(false);
      console.log("📱 Scanner stopped");
    } catch (err) {
      console.log("Error stopping scanner:", err);
      setIsScanning(false);
      setIsProcessing(false);
      setSearchingGame(false);
    }
  };

  useEffect(() => {
    return () => {
      if (isScanning) {
        Quagga.stop();
        Quagga.offDetected(handleDetected);
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
              className="rounded-lg overflow-hidden mb-4"
              style={{
                position: "relative",
                width: "100%",
                maxHeight: "300px",
              }}
            />
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
