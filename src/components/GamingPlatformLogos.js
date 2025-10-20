import React, { useState, useEffect } from "react";

// Gaming platform logos as SVG components
const platforms = [
  {
    name: "PlayStation",
    url: "https://www.playstation.com",
    color: "#0070d1",
    logo: (
      <svg
        width="50px"
        height="50px"
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <path
            d="M5.8,32.1C4.3,33.1,4.8,35,8,35.9c3.3,1.1,6.9,1.4,10.4,0.8c0.2,0,0.4-0.1,0.5-0.1v-3.4l-3.4,1.1
        c-1.3,0.4-2.6,0.5-3.9,0.2c-1-0.3-0.8-0.9,0.4-1.4l6.9-2.4V27l-9.6,3.3C8.1,30.7,6.9,31.3,5.8,32.1z M29,17.1v9.7
        c4.1,2,7.3,0,7.3-5.2c0-5.3-1.9-7.7-7.4-9.6C26,11,23,10.1,20,9.5v28.9l7,2.1V16.2c0-1.1,0-1.9,0.8-1.6C28.9,14.9,29,16,29,17.1z
          M42,29.8c-2.9-1-6-1.4-9-1.1c-1.6,0.1-3.1,0.5-4.5,1l-0.3,0.1v3.9l6.5-2.4c1.3-0.4,2.6-0.5,3.9-0.2c1,0.3,0.8,0.9-0.4,1.4
        l-10,3.7V40L42,34.9c1-0.4,1.9-0.9,2.7-1.7C45.4,32.2,45.1,30.8,42,29.8z"
            fill="#0070d1"
          />
        </g>
      </svg>
    ),
  },
  {
    name: "Xbox",
    url: "https://www.xbox.com",
    color: "#107C10",
    logo: (
      <svg
        width="50px"
        height="50px"
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <path
            d="M25,5C13.954,5,5,13.954,5,25s8.954,20,20,20s20-8.954,20-20S36.046,5,25,5z M33.595,14.786
          c3.694,3.035,6.082,7.623,6.082,12.786c0,0.258-0.009,0.514-0.019,0.769c-0.664-1.413-2.537-4.517-6.909-8.042
          c-3.858-3.11-7.472-5.084-9.279-5.881C27.334,14.042,30.863,14.786,33.595,14.786z M22.089,15.097
          c0.912,0.409,4.057,1.893,7.733,4.816c3.535,2.812,6.136,5.713,7.479,7.549c-1.155,4.867-4.44,8.912-8.763,11.113
          c0,0-3.738-5.836-9.352-12.615C13.764,19.593,10.755,15.421,10.755,15.421C13.506,12.763,17.493,11.145,21.866,11.021
          C21.972,11.485,22.024,14.904,22.089,15.097z M9.019,17.616c0,0,2.809,4.023,8.27,10.696c5.385,6.577,9.128,12.109,9.128,12.109
          c-4.789-0.131-9.132-2.081-12.374-5.237c-3.151-3.068-5.395-7.251-5.998-11.978C8.029,22.652,8.65,20.408,9.019,17.616z"
            fill="#107C10"
          />
        </g>
      </svg>
    ),
  },
  {
    name: "Steam",
    url: "https://store.steampowered.com",
    color: "#171A21",
    logo: (
      <svg
        width="50px"
        height="50px"
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <path
            d="M25,5C13.972,5,5,13.972,5,25c0,8.319,5.084,15.438,12.287,18.406l6.788-4.821
          c-0.179-0.056-0.357-0.117-0.531-0.189c-2.524-1.041-3.724-3.92-2.683-6.443c1.041-2.524,3.92-3.724,6.443-2.683
          c1.223,0.505,2.195,1.46,2.736,2.691l7.062-5.016c0-0.032,0.003-0.063,0.003-0.095c0-5.156-4.182-9.338-9.338-9.338
          c-5.156,0-9.338,4.182-9.338,9.338c0,0.246,0.012,0.489,0.029,0.731l4.877,3.466c0.619-0.17,1.271-0.247,1.943-0.205
          l-6.788,4.822C7.695,32.896,5,29.262,5,25C5,13.972,13.972,5,25,5z M33.287,20.012c0-3.438-2.787-6.225-6.225-6.225
          s-6.225,2.787-6.225,6.225s2.787,6.225,6.225,6.225S33.287,23.45,33.287,20.012z M27.062,16.312c2.394,0,4.331,1.938,4.331,4.331
          s-1.938,4.331-4.331,4.331s-4.331-1.938-4.331-4.331S24.669,16.312,27.062,16.312z M22.844,34.706
          c-0.619,1.5,0.094,3.212,1.594,3.831c1.5,0.619,3.212-0.094,3.831-1.594c0.3-0.725,0.331-1.512,0.144-2.238l-2.537-1.8
          c-0.494,0.181-1.031,0.238-1.594,0.125C23.537,33.906,23.144,34.256,22.844,34.706z"
            fill="#171A21"
          />
        </g>
      </svg>
    ),
  },
  {
    name: "Nintendo",
    url: "https://www.nintendo.com",
    color: "#E60012",
    logo: (
      <svg
        width="50px"
        height="50px"
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <path
            d="M15,7C10.029,7,6,11.029,6,16v18c0,4.971,4.029,9,9,9h8c0.552,0,1-0.448,1-1V8c0-0.552-0.448-1-1-1H15z
           M16,15c1.657,0,3,1.343,3,3s-1.343,3-3,3s-3-1.343-3-3S14.343,15,16,15z M27,7c-0.552,0-1,0.448-1,1v34c0,0.552,0.448,1,1,1
          h8c4.971,0,9-4.029,9-9V16c0-4.971-4.029-9-9-9H27z M34,29c-1.657,0-3-1.343-3-3s1.343-3,3-3s3,1.343,3,3S35.657,29,34,29z"
            fill="#E60012"
          />
        </g>
      </svg>
    ),
  },
  {
    name: "Epic Games",
    url: "https://store.epicgames.com",
    color: "#313131",
    logo: (
      <svg
        width="50px"
        height="50px"
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <path
            d="M25,5C13.954,5,5,13.954,5,25s8.954,20,20,20s20-8.954,20-20S36.046,5,25,5z M32.5,30.5h-15v-3h15V30.5z
           M35,24h-20v-3h20V24z M37.5,17.5h-25v-3h25V17.5z"
            fill="#313131"
          />
        </g>
      </svg>
    ),
  },
  {
    name: "PC Gaming",
    url: "#",
    color: "#4A90E2",
    logo: (
      <svg
        width="50px"
        height="50px"
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <path
            d="M9,12c-1.1,0-2,0.9-2,2v16c0,1.1,0.9,2,2,2h23c1.1,0,2-0.9,2-2V14c0-1.1-0.9-2-2-2H9z M10,15h21v13H10V15z
           M17,33v2h-5v3h16v-3h-5v-2H17z"
            fill="#4A90E2"
          />
        </g>
      </svg>
    ),
  },
];

const GamingPlatformLogos = ({ mode = "rotate", interval = 3000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (mode === "rotate") {
      const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % platforms.length);
      }, interval);

      return () => clearInterval(timer);
    }
  }, [mode, interval]);

  if (mode === "all") {
    // Display all logos horizontally
    return (
      <div className="flex items-center space-x-3">
        {platforms.map((platform, index) => (
          <a
            key={index}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 hover:opacity-70 transition-opacity"
            aria-label={platform.name}
            title={platform.name}
          >
            {platform.logo}
          </a>
        ))}
      </div>
    );
  }

  // Rotate mode - show one logo at a time with fade transition
  const currentPlatform = platforms[currentIndex];

  return (
    <a
      href={currentPlatform.url}
      target="_blank"
      rel="noopener noreferrer"
      className="h-8 w-8 hover:opacity-70 transition-all duration-500"
      aria-label={currentPlatform.name}
      title={currentPlatform.name}
      key={currentIndex}
    >
      <div className="animate-fadeIn">{currentPlatform.logo}</div>
    </a>
  );
};

export default GamingPlatformLogos;
