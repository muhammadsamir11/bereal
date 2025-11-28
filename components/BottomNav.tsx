import React from "react";
import { Users, Send, Home } from "lucide-react";
import { View } from "../types";
import { motion, Variants } from "framer-motion";

interface BottomNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  const isActive = (view: View) =>
    currentView === view ||
    (view === View.PROFILE && currentView === View.EDIT_PROFILE);

  const navItemVariants: Variants = {
    inactive: { scale: 1, y: 0, color: "#4b5563" }, // gray-600
    active: { scale: 1.15, y: -4, color: "#ffffff" }, // increased y lift
    tap: { scale: 0.9 },
  };

  const labelVariants: Variants = {
    inactive: { color: "#4b5563", opacity: 0.8 },
    active: { color: "#ffffff", opacity: 1 },
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent z-50">
      <div className="bg-gradient-to-br p-4 from-[#2C2C2E]/60 to-black rounded-t-3xl flex justify-between items-end max-w-md mx-auto">
        {/* Home - Disabled */}
        <motion.button
          disabled
          className="flex flex-col items-center min-w-[40px] group cursor-default opacity-30"
          initial="inactive"
          animate="inactive"
        >
          <motion.div variants={navItemVariants}>
            <Home
              size={24}
              className="fill-transparent transition-colors duration-300"
              strokeWidth={2}
            />
          </motion.div>
          <motion.span
            variants={labelVariants}
            className="text-[11px] font-medium"
          >
            Home
          </motion.span>
        </motion.button>

        {/* Friends */}
        <motion.button
          onClick={() => onNavigate(View.FRIENDS)}
          className="flex flex-col items-center min-w-[40px] group cursor-pointer"
          initial="inactive"
          animate={isActive(View.FRIENDS) ? "active" : "inactive"}
          whileTap="tap"
        >
          <motion.div variants={navItemVariants}>
            <Users
              size={24}
              className={`transition-colors duration-300 ${
                isActive(View.FRIENDS) ? "fill-white" : "fill-transparent"
              }`}
              strokeWidth={isActive(View.FRIENDS) ? 0 : 2}
            />
          </motion.div>
          <motion.span
            variants={labelVariants}
            className="text-[11px] font-medium"
          >
            Friends
          </motion.span>
        </motion.button>

        {/* Camera Button (Center) */}
        <motion.button
          disabled
          className="mb-1 cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
        >
          <div className="w-14 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/10 ring-2 ring-white/10">
            <svg
              width="26"
              height="26"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.0028 21C18.212 21 20.0028 19.2091 20.0028 17C20.0028 14.7909 18.212 13 16.0028 13C13.7937 13 12.0028 14.7909 12.0028 17C12.0028 19.2091 13.7937 21 16.0028 21Z"
                fill="black"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M19.0239 5C20.247 5 21.3805 5.64173 22.0097 6.69053C22.5955 7.66675 23.6228 8.29093 24.757 8.38877C25.0632 8.41519 25.3582 8.44204 25.6414 8.46901C28.1645 8.70935 30 10.8581 30 13.3926V19.9273C30 23.4116 27.4355 26.3611 23.9626 26.642C21.5561 26.8366 18.6627 27 15.7292 27C12.9103 27 10.21 26.8491 7.96137 26.6646C4.5197 26.3822 2 23.4518 2 19.9986V13.3691C2 10.8385 3.81265 8.68835 6.33135 8.44328C6.62893 8.41433 6.94017 8.38563 7.26454 8.35758C8.38975 8.2603 9.41 7.64236 9.99108 6.6739C10.6142 5.63542 11.7364 5 12.9475 5H19.0239ZM15.9991 23C19.3128 23 21.9991 20.3137 21.9991 17C21.9991 13.6863 19.3128 11 15.9991 11C12.6854 11 9.99911 13.6863 9.99911 17C9.99911 20.3137 12.6854 23 15.9991 23ZM27.0249 13.5C27.0249 14.3284 26.3534 15 25.5249 15C24.6965 15 24.0249 14.3284 24.0249 13.5C24.0249 12.6716 24.6965 12 25.5249 12C26.3534 12 27.0249 12.6716 27.0249 13.5Z"
                fill="black"
              />
            </svg>
          </div>
        </motion.button>

        {/* Chat - Disabled */}
        <motion.button
          disabled
          className="flex flex-col items-center min-w-[40px] group cursor-default opacity-30"
          initial="inactive"
          animate="inactive"
        >
          <motion.div variants={navItemVariants}>
            <Send
              size={24}
              className="fill-transparent transition-colors duration-300"
              strokeWidth={2}
            />
          </motion.div>
          <motion.span
            variants={labelVariants}
            className="text-[11px] font-medium"
          >
            Chat
          </motion.span>
        </motion.button>

        {/* Profile */}
        <motion.button
          onClick={() => onNavigate(View.PROFILE)}
          className="flex flex-col items-center min-w-[40px] group cursor-pointer"
          initial="inactive"
          animate={isActive(View.PROFILE) ? "active" : "inactive"}
          whileTap="tap"
        >
          <motion.div
            variants={navItemVariants}
            className={`w-[24px] h-[28px] rounded-lg overflow-hidden border transition-colors duration-300 ${
              isActive(View.PROFILE) ? "border-white" : "border-gray-600"
            }`}
          >
            <img
              src="/faces/gaze_px3p0_pym3p0_256.webp"
              alt="Profile"
              className="w-full h-full object-cover rounded-md"
            />
          </motion.div>
          <motion.span
            variants={labelVariants}
            className="text-[11px] font-medium"
          >
            Profile
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
};

export default BottomNav;
