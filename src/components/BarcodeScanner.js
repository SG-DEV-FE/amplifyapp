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
  const lastScannedRef = useRef({ code: null, ts: 0 });
  const detectionBufferRef = useRef({
    map: new Map(),
    timer: null,
    attempts: 0,
  });

  const searchGameByBarcode = async (barcode) => {
    console.log("🔍 Searching for barcode:", barcode);
    try {
      // Build barcode variants to handle EAN-13 vs UPC-A, partial reads, etc.
      const cleaned = (barcode || "").replace(/\D+/g, "");
      const variants = [cleaned];
      if (cleaned.length === 13) {
        // EAN-13 may correspond to UPC-A by dropping the leading country digit
        variants.push(cleaned.slice(1));
      }
      if (cleaned.length === 12) {
        // UPC-A sometimes represented as EAN-13 with leading 0
        variants.push("0" + cleaned);
      }
      if (cleaned.length > 8) {
        // add last 8 in case of short/ean-8 style reads
        variants.push(cleaned.slice(-8));
      }
      // include original barcode string too if it contained formatting
      if (!variants.includes(barcode)) variants.push(barcode);

      // dedupe and filter
      const uniqVariants = [...new Set(variants)].filter(Boolean);
      console.log("🔁 Barcode variants to try:", uniqVariants);

      // Try UPC DB for each variant
      for (const v of uniqVariants) {
        try {
          const resp = await fetch(
            `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(
              v
            )}`
          );
          if (!resp.ok) {
            console.log(`❌ UPC DB responded ${resp.status} for variant ${v}`);
            continue;
          }
          const data = await resp.json();
          console.log("📦 UPC DB response for", v, data && data.code);
          if (
            data &&
            data.code === "OK" &&
            data.items &&
            data.items.length > 0
          ) {
            const item = data.items[0];
            const cleanTitle = (item.title || "")
              .replace(/\s*\([^)]*\)\s*/g, " ")
              .trim();
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
            const isGame = gameKeywords.some((k) =>
              (item.title || "").toLowerCase().includes(k)
            );
            console.log(`✅ UPC DB match for variant ${v}:`, cleanTitle);
            return {
              name: cleanTitle,
              originalName: item.title,
              barcode: v,
              isGame,
              variantUsed: v,
            };
          }
        } catch (e) {
          console.error("UPC DB lookup error for variant", v, e);
        }
      }

      // Try RAWG direct search for barcode variants
      console.log("🎮 Trying RAWG direct search with barcode variants...");
      for (const v of uniqVariants) {
        try {
          const rawgResp = await fetch(
            `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(
              v
            )}&page_size=5`
          );
          if (!rawgResp.ok) {
            console.log(
              `❌ RAWG responded ${rawgResp.status} for variant ${v}`
            );
            continue;
          }
          const data = await rawgResp.json();
          if (data && data.results && data.results.length > 0) {
            console.log(
              `✅ Found in RAWG by variant ${v}:`,
              data.results[0].name
            );
            return {
              name: data.results[0].name,
              barcode: v,
              rawgDirect: true,
              variantUsed: v,
            };
          }
        } catch (e) {
          console.error("RAWG lookup error for variant", v, e);
        }
      }

      console.log("❌ No game found for barcode (all variants):", uniqVariants);
      return null;
    } catch (error) {
      console.error("Barcode search error:", error);
      return null;
    }
  };

  // Helper to process a stable barcode: calls searchGameByBarcode and then RAWG name searches
  const processBarcode = async (code) => {
    try {
      const gameInfo = await searchGameByBarcode(code);

      if (!gameInfo) {
        setError(
          `Barcode ${code} not found in our video game databases. Please use the manual search function above to find and add your game.`
        );
        setSearchingGame(false);
        setIsProcessing(false);
        return;
      }

      // Try multiple name variants against RAWG: cleaned name, original title
      const candidates = [];
      if (gameInfo.name) candidates.push(gameInfo.name);
      if (gameInfo.originalName && gameInfo.originalName !== gameInfo.name)
        candidates.push(gameInfo.originalName);

      // Ensure uniqueness and simple cleanup of whitespace
      const uniqCandidates = [
        ...new Set(candidates.map((c) => (c || "").trim())),
      ].filter(Boolean);

      let rawgGame = null;
      for (const candidate of uniqCandidates) {
        console.log("🔎 RAWG search attempt for:", candidate);
        rawgGame = await searchRAWGByName(candidate);
        if (rawgGame) {
          console.log(
            "✅ RAWG match for candidate:",
            candidate,
            "->",
            rawgGame.name
          );
          break;
        }
      }

      if (rawgGame) {
        const gameWithWishlist = { ...rawgGame, isWishlisted: addToWishlist };
        onGameFound(gameWithWishlist);
        if (onGameAdd) await onGameAdd(gameWithWishlist);
        setTimeout(() => onClose(), 1000);
      } else {
        console.log("❌ No RAWG match for any candidate:", uniqCandidates);
        setError(
          `Found "${gameInfo.name}" from barcode but couldn't locate it in our game database. Please use the manual search to find and add your game.`
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

  const handleDetected = (result) => {
    if (isProcessing || !result || !result.codeResult) return;

    const code = result.codeResult.code;

    // Basic validation: numeric and reasonable length
    if (!code || !/^\d+$/.test(code) || code.length < 6 || code.length > 20) {
      console.log("❌ Invalid barcode format:", code, "Length:", code?.length);
      return;
    }

    const buf = detectionBufferRef.current;
    const prev = buf.map.get(code) || 0;
    buf.map.set(code, prev + 1);

    // Immediate accept for typical full-length UPC/EAN
    if (code.length >= 12) {
      const now = Date.now();
      if (
        lastScannedRef.current.code === code &&
        now - lastScannedRef.current.ts < 5000
      ) {
        console.log("🔁 Duplicate scan ignored for:", code);
        return;
      }
      lastScannedRef.current = { code, ts: now };

      // Clear buffer and any pending timer
      if (buf.timer) {
        clearTimeout(buf.timer);
        buf.timer = null;
      }
      buf.map.clear();

      console.log("✅ Stable barcode detected (full length):", code);
      setIsProcessing(true);
      setScannedCode(code);
      setSearchingGame(true);

      stopScanning();
      // process asynchronously, don't await to avoid blocking Quagga handlers
      processBarcode(code);
      return;
    }

    // For shorter/partial reads, wait briefly to accumulate
    if (!buf.timer) {
      // longer collection window to build stable read
      buf.timer = setTimeout(() => {
        try {
          let best = null;
          for (const [c, count] of buf.map.entries()) {
            if (!best) best = { code: c, count };
            else if (c.length > best.code.length) best = { code: c, count };
            else if (c.length === best.code.length && count > best.count)
              best = { code: c, count };
          }

          buf.map.clear();
          buf.timer = null;

          if (!best) return;

          const chosen = best.code;
          const now = Date.now();
          if (
            lastScannedRef.current.code === chosen &&
            now - lastScannedRef.current.ts < 5000
          ) {
            console.log("🔁 Duplicate (after buffer) ignored for:", chosen);
            return;
          }
          lastScannedRef.current = { code: chosen, ts: now };

          console.log("🟡 Buffered barcode chosen:", chosen);
          setIsProcessing(true);
          setScannedCode(chosen);
          setSearchingGame(true);

          // If the chosen code is short (<12), allow a few more attempts to collect a full-length code
          if (chosen.length < 12 && (buf.attempts || 0) < 5) {
            buf.attempts = (buf.attempts || 0) + 1;
            console.log(
              `🔁 Short code (${chosen.length}) — attempt ${buf.attempts}, continuing scan to improve accuracy`
            );
            // leave scanner running; set a new timer to re-evaluate after 1.5s
            buf.timer = setTimeout(() => {
              try {
                // evaluation will run again by the same timer logic when detections accumulate
                // simply return here; next detections will re-trigger buffer handler
                buf.timer = null;
              } catch (e) {
                console.error("Error in retry timer:", e);
              }
            }, 1500);
            // do not stop scanning yet
            return;
          }

          // reset attempts after we decide to process
          buf.attempts = 0;

          stopScanning();
          processBarcode(chosen);
        } catch (err) {
          console.error("Error processing buffered barcode:", err);
          setError(`Failed to process barcode. Please try again.`);
          setSearchingGame(false);
          setIsProcessing(false);
        }
      }, 1200);
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

  // Decode a single image file using Quagga.decodeSingle (useful for debugging scanned photos)
  const decodeImageFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      setError("");
      setSearchingGame(true);
      setIsProcessing(true);

      Quagga.decodeSingle(
        {
          src,
          numOfWorkers: 0, // decodeSingle must run in main thread
          inputStream: { size: 800 },
          decoder: {
            readers: [
              "ean_reader",
              "upc_reader",
              "ean_8_reader",
              "upc_e_reader",
            ],
          },
        },
        (result) => {
          if (result && result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code;
            console.log("decodeSingle found code:", code, result);
            setScannedCode(code);
            processBarcode(code);
          } else {
            console.log("decodeSingle found nothing", result);
            setError(
              "No barcode detected in image. Try a different photo or use live scanning."
            );
            setSearchingGame(false);
            setIsProcessing(false);
          }
        }
      );
    };
    reader.onerror = (e) => {
      console.error("Failed to read file:", e);
      setError("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const stopScanning = () => {
    try {
      Quagga.stop();
      Quagga.offDetected(handleDetected);
      Quagga.offProcessed();
      setIsScanning(false);
      setIsProcessing(false);
      setSearchingGame(false);
      // clear detection buffer
      try {
        const buf = detectionBufferRef.current;
        if (buf.timer) {
          clearTimeout(buf.timer);
          buf.timer = null;
        }
        buf.map.clear();
        buf.attempts = 0;
      } catch (e) {
        // ignore
      }
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
            <div className="mt-2 text-center">
              <label className="block text-sm text-gray-600 mb-1">
                Or choose an image to decode
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  if (f) decodeImageFile(f);
                }}
                className="mx-auto"
              />
            </div>
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
            {/* Debug overlay showing recent detections */}
            <div className="mt-2 text-left text-xs text-gray-400 bg-white bg-opacity-10 p-2 rounded">
              <div className="font-semibold text-sm mb-1">
                Debug: recent detections
              </div>
              <div style={{ maxHeight: 80, overflowY: "auto" }}>
                {Array.from(detectionBufferRef.current.map.entries()).length ===
                0 ? (
                  <div className="text-xs text-gray-300">
                    (no buffered detections yet)
                  </div>
                ) : (
                  Array.from(detectionBufferRef.current.map.entries()).map(
                    ([code, count]) => (
                      <div key={code} className="flex justify-between">
                        <div className="truncate">{code}</div>
                        <div className="ml-2">{count}</div>
                      </div>
                    )
                  )
                )}
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
