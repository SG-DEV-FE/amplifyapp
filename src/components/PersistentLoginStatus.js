import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const PersistentLoginStatus = () => {
  const { getPersistentLoginInfo, disablePersistentLogin } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  
  const loginInfo = getPersistentLoginInfo();
  
  if (!loginInfo.isEnabled) {
    return null;
  }

  const handleDisable = () => {
    if (window.confirm("This will disable 'Remember Me' but keep you logged in for this session. You'll need to log in again next time. Continue?")) {
      disablePersistentLogin();
      setShowDetails(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-blue-800">
            You're using persistent login
          </p>
          <p className="mt-1 text-sm text-blue-700">
            You'll stay logged in for {loginInfo.daysRemaining} more days.
            {' '}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="font-medium underline hover:no-underline"
            >
              {showDetails ? 'Hide details' : 'Show details'}
            </button>
          </p>
          
          {showDetails && (
            <div className="mt-3 border-t border-blue-200 pt-3">
              <div className="text-sm text-blue-700 space-y-2">
                <p>
                  <strong>Account:</strong> {loginInfo.email}
                </p>
                <p>
                  <strong>Feature:</strong> "Remember Me" keeps you logged in across browser sessions
                </p>
                <p>
                  <strong>Security:</strong> Token expires in {loginInfo.daysRemaining} days
                </p>
              </div>
              <div className="mt-3 flex space-x-3">
                <button
                  onClick={handleDisable}
                  className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-md border border-blue-300 transition-colors"
                >
                  Disable "Remember Me"
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersistentLoginStatus;