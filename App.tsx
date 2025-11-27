import React, { useState, useRef, useEffect } from "react";
import { View, User } from "./types";
import {
  CURRENT_USER,
  FRIEND_USER,
  OFFICIAL_USER,
  NON_FRIEND_USER,
  MOCK_MEMORIES,
  PINNED_MEMORIES,
} from "./constants";
import BottomNav from "./components/BottomNav";
import ProfileView from "./components/ProfileView";
import Button from "./components/Button";
import { Search, BadgeCheck, UserPlus } from "lucide-react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.FRIENDS);
  const [viewingUser, setViewingUser] = useState<User>(CURRENT_USER);
  const [searchQuery, setSearchQuery] = useState("");

  // History stack to store { View, User } tuples
  const [history, setHistory] = useState<{ view: View; user: User }[]>([]);
  // Direction state for animation: 0 = fade, 1 = push (right to left), -1 = pop (left to right)
  const [direction, setDirection] = useState<number>(0);

  // Group users for search/filtering
  const myFriends = [FRIEND_USER];
  const suggestions = [OFFICIAL_USER, NON_FRIEND_USER];

  // Helper to push current state to history before navigation
  const pushToHistory = () => {
    setHistory((prev) => [...prev, { view: currentView, user: viewingUser }]);
  };

  const handleNav = (view: View, dir: number = 0) => {
    if (view === currentView) return;
    pushToHistory();
    setDirection(dir);
    if (view === View.PROFILE) {
      setViewingUser(CURRENT_USER);
    }
    setCurrentView(view);
  };

  const handleBack = () => {
    setDirection(-1); // Pop animation
    if (history.length > 0) {
      const previousState = history[history.length - 1];
      // Remove last item
      setHistory((prev) => prev.slice(0, -1));
      // Restore state
      setViewingUser(previousState.user);
      setCurrentView(previousState.view);
    } else {
      // Fallback default navigation if history is empty
      setCurrentView(View.FRIENDS);
    }
  };

  const handleViewProfile = (user: User) => {
    pushToHistory();
    setDirection(1); // Push animation
    setViewingUser(user);
    setCurrentView(View.OTHER_PROFILE);
  };

  // Swipe Handler for Navigation
  const onPanEnd = (event: any, info: PanInfo) => {
    // Prevent vertical swipes from triggering navigation (prioritize scroll)
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) return;

    const SWIPE_THRESHOLD = 50;
    const VELOCITY_THRESHOLD = 500;

    const isRightSwipe =
      info.offset.x > SWIPE_THRESHOLD || info.velocity.x > VELOCITY_THRESHOLD;
    const isLeftSwipe =
      info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -VELOCITY_THRESHOLD;

    // Swipe Right (User moves finger Left -> Right) -> Go Back / Previous Tab
    if (isRightSwipe) {
      if (history.length > 0) {
        handleBack();
      } else {
        // Tab Navigation (Previous) with reverse animation
        // Order: Friends <-> Camera <-> Profile
        if (currentView === View.CAMERA) handleNav(View.FRIENDS, -1);
        else if (currentView === View.PROFILE) handleNav(View.CAMERA, -1);
      }
    }

    // Swipe Left (User moves finger Right -> Left) -> Go Next Tab
    else if (isLeftSwipe) {
      if (history.length === 0) {
        // Tab Navigation (Next) with forward animation
        if (currentView === View.FRIENDS) handleNav(View.CAMERA, 1);
        else if (currentView === View.CAMERA) handleNav(View.PROFILE, 1);
      }
    }
  };

  // Filter users based on search query
  const filterUsers = (users: User[]) => {
    if (!searchQuery) return users;
    const lowerQuery = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(lowerQuery) ||
        user.displayName.toLowerCase().includes(lowerQuery)
    );
  };

  const filteredFriends = filterUsers(myFriends);
  const filteredSuggestions = filterUsers(suggestions);

  // Only show BottomNav on specific views
  const showBottomNav = [
    View.HOME,
    View.FRIENDS,
    View.INBOX,
    View.CAMERA,
  ].includes(currentView);

  // Animation Variants
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : direction < 0 ? "-25%" : 0,
      opacity: direction === 0 ? 0 : 1,
      scale: direction === 0 ? 0.98 : 1,
      zIndex: direction === 1 ? 10 : 1, // Push: New on top. Pop: New (Old) on bottom
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: 5,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : direction > 0 ? "-25%" : 0,
      opacity: direction === 0 ? 0 : 1,
      scale: direction === 0 ? 1 : direction > 0 ? 0.9 : 1,
      zIndex: direction === -1 ? 10 : 1, // Pop: Old on top. Push: Old on bottom
    }),
  };

  const renderContent = () => {
    switch (currentView) {
      case View.PROFILE:
      case View.OTHER_PROFILE:
        return (
          <ProfileView
            user={viewingUser}
            isCurrentUser={viewingUser.id === CURRENT_USER.id}
            memories={MOCK_MEMORIES}
            // Show pins for current user AND friends. Reverse for friends to simulate different content.
            pinnedMemories={
              viewingUser.id === CURRENT_USER.id
                ? PINNED_MEMORIES
                : viewingUser.isFriend
                ? [...PINNED_MEMORIES].reverse()
                : []
            }
            onEditProfile={() => {}}
            onBack={handleBack}
          />
        );

      case View.FRIENDS:
        return (
          <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide bg-black text-white pb-24">
            <div className="p-4">
              <div className="relative mb-4">
                <Search
                  className="absolute left-3.5 top-2.5 text-gray-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search friends and more"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1C1C1E] text-white pl-10 pr-4 py-2 rounded-xl focus:outline-white/20 focus:ring-1 focus:ring-white/20 placeholder-gray-500 transition-all"
                />
              </div>

              {filteredFriends.length === 0 &&
                filteredSuggestions.length === 0 &&
                searchQuery && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <p>No results found for "{searchQuery}"</p>
                  </div>
                )}

              {filteredFriends.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">
                    My Friends
                  </p>

                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => handleViewProfile(friend)}
                      className="flex items-center justify-between p-2 hover:bg-white/10 rounded-2xl transition-all duration-200 cursor-pointer group active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="relative">
                          <img
                            src={friend.avatarUrl}
                            className="w-12 h-14 rounded-xl object-cover border border-white/20"
                            alt={friend.displayName}
                          />
                        </div>
                        <div className="flex flex-col justify-center">
                          <p className="font-semibold text-[15px] leading-tight mb-0.5">
                            {friend.displayName}
                          </p>
                          <p className="text-[13px] text-gray-500 font-medium">
                            @{friend.username}
                          </p>
                        </div>
                      </div>
                      {/*<Button variant="secondary" size="sm" className="h-8 px-4 text-xs font-semibold bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white border-0">View</Button>*/}
                    </div>
                  ))}
                </div>
              )}

              {filteredSuggestions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">
                    RECOMMENDED FRIENDS
                  </p>

                  {filteredSuggestions.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleViewProfile(user)}
                      className="flex items-center justify-between p-2 hover:bg-white/10 rounded-2xl transition-all duration-200 cursor-pointer group active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="relative">
                          <img
                            src={user.avatarUrl}
                            className="w-12 h-14 rounded-xl object-cover border border-white/20"
                            alt={user.displayName}
                          />
                        </div>
                        <div className="flex flex-col justify-center">
                          <div className="flex items-center gap-1">
                            <p className="font-semibold text-[15px] leading-tight mb-0.5">
                              {user.displayName}
                            </p>
                            {user.isVerified && (
                              <BadgeCheck
                                size={14}
                                className="text-blue-500"
                                fill="currentColor"
                                stroke="black"
                              />
                            )}
                          </div>
                          <p className="text-[13px] text-gray-500 font-medium">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        className="h-8 px-3 text-xs font-bold border-0 gap-1"
                      >
                        <UserPlus size={14} /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case View.CAMERA:
        return (
          <div className="flex flex-col items-center justify-center h-full bg-black text-white relative overflow-hidden">
            {/* Mock Camera Viewfinder */}
            <div className="absolute inset-0 bg-gray-900">
              {/* Placeholder for camera feed */}
              <div className="w-full h-full flex items-center justify-center text-white/20">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </div>

            {/* Controls Overlay */}
            <div className="absolute bottom-32 left-0 right-0 flex justify-center items-center gap-8 z-10">
              <div className="w-12 h-12 rounded-full bg-black/40 border border-white/20 backdrop-blur-md"></div>
              <div className="w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center">
                <div className="w-16 h-16 bg-white rounded-full"></div>
              </div>
              <div className="w-12 h-12 rounded-full bg-black/40 border border-white/20 backdrop-blur-md"></div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full bg-black text-white p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Work in Progress</h2>
            <p className="text-gray-500 mb-6">
              This section is under construction.
            </p>
            <Button variant="secondary" onClick={() => handleNav(View.FRIENDS)}>
              Go to Friends
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col justify-center h-full w-full relative bg-neutral-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
      {/* Logo */}
      <div className="hidden flex-col items-center py-4 sm:flex z-20">
        <svg
          width="84"
          height="18"
          viewBox="0 0 84 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_3_2314)">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M80.3579 17.6882H84V14.2255H80.3579V17.6882ZM7.59373 9.94902H3.52371V14.9093H7.34789C8.29453 14.9093 9.05512 14.7018 9.62875 14.286C10.2024 13.8705 10.4892 13.2821 10.4892 12.5201C10.4892 11.689 10.2248 11.0527 9.69704 10.6113C9.16863 10.1701 8.46783 9.94902 7.59373 9.94902ZM6.41916 2.83322H3.52371V7.22216H6.14601C7.12937 7.22216 7.89846 7.04499 8.45418 6.68977C9.00959 6.33514 9.2873 5.77678 9.2873 5.01471C9.2873 4.18395 9.03205 3.61261 8.52246 3.30068C8.01227 2.98904 7.31117 2.83322 6.41916 2.83322ZM6.93816 0.0284517C8.74099 0.0284517 10.2066 0.405018 11.336 1.15815C12.4647 1.91157 13.0295 3.17978 13.0295 4.96277C13.0295 5.62096 12.8699 6.21395 12.5515 6.74171C12.2328 7.27006 11.8182 7.72454 11.3087 8.10514C12.146 8.52066 12.8338 9.08364 13.371 9.7932C13.9079 10.5033 14.1768 11.4033 14.1768 12.4941C14.1768 14.1218 13.5801 15.3944 12.3876 16.312C11.1945 17.2296 9.60568 17.6881 7.62105 17.6881H0V0.0284517H6.93816ZM25.4304 10.1308C25.248 9.283 24.9202 8.6551 24.447 8.24824C23.9733 7.84137 23.3817 7.63765 22.6715 7.63765C21.9428 7.63765 21.3331 7.85003 20.8414 8.27392C20.3497 8.69839 20.0307 9.31734 19.8853 10.1308H25.4304ZM23.491 18C21.1965 18 19.3888 17.4024 18.0688 16.2081C16.7483 15.0134 16.0885 13.412 16.0885 11.4033C16.0885 9.39525 16.6848 7.78511 17.8776 6.57288C19.0701 5.36123 20.6954 4.75526 22.7535 4.75526C24.8294 4.75526 26.3543 5.40884 27.3288 6.716C28.3028 8.02316 28.7902 9.56867 28.7902 11.3514V12.3902H19.858C20.0219 13.2212 20.4222 13.8837 21.0599 14.3772C21.6973 14.8706 22.5349 15.117 23.5729 15.117C24.1739 15.117 24.7156 15.0437 25.1982 14.8966C25.6805 14.7497 26.2405 14.5373 26.8781 14.2603L27.9161 16.7015C27.2967 17.1516 26.5455 17.4806 25.6626 17.6881C24.7791 17.8958 24.0552 18 23.491 18ZM37.2854 2.83331H35.1001V8.23508H37.34C38.3959 8.23508 39.27 8.03194 39.9623 7.62478C40.6543 7.21821 41.0003 6.54703 41.0003 5.6121C41.0003 4.62524 40.6725 3.91539 40.0169 3.48256C39.3613 3.05001 38.4505 2.83331 37.2854 2.83331ZM42.3664 17.6882L38.4326 10.936C38.232 10.9533 38.0229 10.9663 37.8044 10.9749C37.5858 10.9839 37.3673 10.9879 37.1488 10.9879H35.1001V17.6882H31.5764V0.0285382H37.3946C39.416 0.0285382 41.1457 0.470029 42.5843 1.35301C44.0232 2.23599 44.7428 3.60375 44.7428 5.45628C44.7428 6.54703 44.4463 7.48628 43.8548 8.27404C43.2626 9.06179 42.5026 9.67238 41.5739 10.1049L46.1359 17.6882H42.3664ZM56.3516 10.1308C56.1695 9.283 55.8417 8.6551 55.3686 8.24824C54.8945 7.84137 54.3029 7.63765 53.5927 7.63765C52.8643 7.63765 52.2543 7.85003 51.7629 8.27392C51.2712 8.69839 50.9522 9.31734 50.8065 10.1308H56.3516ZM54.4122 18C52.118 18 50.3103 17.4024 48.9901 16.2081C47.6698 15.0134 47.01 13.412 47.01 11.4033C47.01 9.39525 47.6061 7.78511 48.7989 6.57288C49.9916 5.36123 51.6166 4.75526 53.675 4.75526C55.751 4.75526 57.2758 5.40884 58.2504 6.716C59.2243 8.02316 59.7114 9.56867 59.7114 11.3514V12.3902H50.7795C50.9434 13.2212 51.3435 13.8837 51.9814 14.3772C52.6185 14.8706 53.4562 15.117 54.4945 15.117C55.0951 15.117 55.6369 15.0437 56.1194 14.8966C56.6017 14.7497 57.162 14.5373 57.7996 14.2603L58.8373 16.7015C58.2182 17.1516 57.467 17.4806 56.5841 17.6881C55.7003 17.8958 54.9767 18 54.4122 18ZM66.4636 15.3961C68.0752 15.3961 69.2559 14.4139 69.2559 13.1041V12.2038L66.5377 12.3671C65.1476 12.4491 64.4219 13.0103 64.4219 13.8994V13.9227C64.4219 14.8464 65.2214 15.3961 66.4636 15.3961ZM60.8673 14.0979V14.0748C60.8673 11.7943 62.7244 10.4609 65.9965 10.2621L69.2559 10.0751V9.30352C69.2559 8.19229 68.4932 7.50235 67.091 7.50235C65.7504 7.50235 64.9385 8.09879 64.7664 8.9056L64.7415 9.01092H61.4576L61.47 8.87068C61.6667 6.55502 63.7576 4.89438 67.2388 4.89438C70.6456 4.89438 72.8476 6.56685 72.8476 9.09258V17.6881H69.2559V15.8171H69.1821C68.4316 17.1035 67.0297 17.8869 65.2951 17.8869C62.6507 17.8869 60.8673 16.3082 60.8673 14.0979ZM74.8028 17.6882H78.5675V0H74.8028V17.6882Z"
              fill="#FAFAFA"
            />
          </g>
          <defs>
            <clipPath id="clip0_3_2314">
              <rect width="84" height="18" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </div>

      {/* Mobile View */}
      <div className="relative z-10 bg-black flex flex-col h-screen max-h-screen sm:max-h-[650px] w-full max-w-md sm:w-[360px] mx-auto border-0 border-white/10 sm:border rounded-none sm:rounded-3xl overflow-hidden shadow-2xl">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={currentView + viewingUser.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            onPanEnd={onPanEnd}
            style={{ touchAction: "pan-y" }} // Allow vertical scroll
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute inset-0 w-full h-full bg-black"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

        {showBottomNav && (
          <BottomNav
            currentView={currentView}
            onNavigate={(v) => handleNav(v, 0)}
          />
        )}
      </div>
    </div>
  );
};

export default App;
