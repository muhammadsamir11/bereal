import React, { useState, useEffect, useMemo, useRef } from "react";
import { User, Memory } from "../types";
import {
  Share2,
  MoreHorizontal,
  X,
  Users,
  ArrowLeft,
  Lock,
  Check,
  Instagram,
  Ghost,
  BadgeCheck,
  Link as LinkIcon,
  Flame,
  Smile,
} from "lucide-react";
import Button from "./Button";
import MemoriesCalendar from "./MemoriesCalendar";
import FacePhotoTracker from "./FacePhotoTracker";
import {
  motion,
  animate,
  useMotionValue,
  AnimatePresence,
  useScroll,
  useTransform,
  useAnimation,
} from "framer-motion";
import { HIGHLIGHT_IMAGES, HIGHLIGHT_SELFIES } from "../constants";

interface ProfileViewProps {
  user: User;
  isCurrentUser: boolean;
  memories: Memory[];
  pinnedMemories: Memory[];
  onEditProfile: () => void;
  onBack?: () => void;
}

// Helper to format numbers (e.g. 1.5k, 2.3M)
const formatNumber = (num?: number) => {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toString();
};

// Animated Number Component
const AnimatedNumber = ({ value }: { value?: number }) => {
  const val = value || 0;
  const count = useMotionValue(0);
  const [display, setDisplay] = useState(formatNumber(0));

  useEffect(() => {
    const controls = animate(count, val, {
      duration: 1.5,
      ease: "circOut",
      onUpdate: (latest) => {
        setDisplay(formatNumber(Math.round(latest)));
      },
    });
    return controls.stop;
  }, [val]);

  return (
    <span>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{formatNumber(val)}</span>
    </span>
  );
};

// Confetti Animation Component
const Confetti = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        angle: Math.random() * 360, // Radial explosion
        velocity: 150 + Math.random() * 350, // Speed variance
        color: ["#FFFFFF", "#FFD700", "#FF453A", "#32D74B", "#0A84FF"][
          Math.floor(Math.random() * 5)
        ],
        size: 5 + Math.random() * 7,
        spin: (Math.random() - 0.5) * 720,
        delay: Math.random() * 0.1,
      })),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm shadow-sm"
          style={{
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            top: "50%",
            left: "50%",
          }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.velocity,
            y: Math.sin((p.angle * Math.PI) / 180) * p.velocity + 150, // Add gravity (y positive is down)
            rotate: p.spin,
            scale: [0, 1.2, 0],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 1.8, ease: "easeOut", delay: p.delay }}
        />
      ))}
    </div>
  );
};

const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  isCurrentUser,
  memories,
  pinnedMemories,
  onEditProfile,
  onBack,
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Pins State
  const [localPins, setLocalPins] = useState(pinnedMemories);
  const [isEditingPins, setIsEditingPins] = useState(false);
  const [pinToRemove, setPinToRemove] = useState<string | null>(null);

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Scroll & Parallax
  const containerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });
  const avatarControls = useAnimation();

  // Enhanced Parallax settings with Pull-to-Zoom support for Cover
  const coverY = useTransform(scrollY, [0, 500], [0, 200]); // Moves slower than scroll (classic parallax)
  const coverScale = useTransform(scrollY, [-200, 0, 500], [1.5, 1, 1.1]); // Zoom heavily on pull down
  const coverOpacity = useTransform(scrollY, [0, 400], [1, 0.4]); // Fade out on scroll down
  const coverBlur = useTransform(
    scrollY,
    [-100, 0, 300],
    ["blur(0px)", "blur(0px)", "blur(12px)"]
  ); // Blur on scroll down

  // Avatar Pull-Down Effect (Elastic feel)
  const avatarScale = useTransform(scrollY, [-150, 0], [1.15, 1]);
  const avatarY = useTransform(scrollY, [-150, 0], [15, 0]);

  // Private Profile Logic
  const isPrivate = !isCurrentUser && !user.isFriend && !user.isVerified;
  const isOfficial = user.isVerified;

  // Handle Highlights for Official Users
  const displayPins = useMemo(() => {
    if (user.isVerified && !isCurrentUser) {
      return HIGHLIGHT_IMAGES.map((url, i) => ({
        id: `highlight-${i}`,
        date: `Mission ${i + 1} 2024`,
        imageUrl: url,
        selfieUrl: HIGHLIGHT_SELFIES[i % HIGHLIGHT_SELFIES.length],
      }));
    }
    return localPins;
  }, [user.isVerified, isCurrentUser, localPins]);

  useEffect(() => {
    setLocalPins(pinnedMemories);
    setIsEditingPins(false);
    setPinToRemove(null);
    setIsFollowing(false);
    setShowConfetti(false);

    // Reset scroll on mount/user change
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [pinnedMemories, user.id]);

  // Disable scroll when Unpin Memory modal is open and position modal in viewport
  useEffect(() => {
    if (pinToRemove && containerRef.current && modalContainerRef.current) {
      // Store current scroll position
      const scrollPosition = containerRef.current.scrollTop;
      // Disable scroll by setting overflow hidden
      containerRef.current.style.overflow = "hidden";
      // Store scroll position in a data attribute for restoration
      containerRef.current.setAttribute(
        "data-scroll-position",
        scrollPosition.toString()
      );

      // Position modal based on visible viewport bounds
      const updateModalPosition = () => {
        if (containerRef.current && modalContainerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          modalContainerRef.current.style.position = "fixed";
          modalContainerRef.current.style.top = `${rect.top}px`;
          modalContainerRef.current.style.left = `${rect.left}px`;
          modalContainerRef.current.style.width = `${rect.width}px`;
          modalContainerRef.current.style.height = `${rect.height}px`;
        }
      };

      updateModalPosition();
      // Update on resize
      window.addEventListener("resize", updateModalPosition);

      return () => {
        window.removeEventListener("resize", updateModalPosition);
      };
    } else if (containerRef.current && modalContainerRef.current) {
      // Re-enable scroll
      const savedPosition = containerRef.current.getAttribute(
        "data-scroll-position"
      );
      containerRef.current.style.overflow = "";
      containerRef.current.removeAttribute("data-scroll-position");
      // Restore scroll position
      if (savedPosition) {
        containerRef.current.scrollTop = parseInt(savedPosition, 10);
      }
      // Reset modal positioning
      if (modalContainerRef.current) {
        modalContainerRef.current.style.position = "";
        modalContainerRef.current.style.top = "";
        modalContainerRef.current.style.left = "";
        modalContainerRef.current.style.width = "";
        modalContainerRef.current.style.height = "";
      }
    }
  }, [pinToRemove]);

  // Start idle breathing animation on mount
  useEffect(() => {
    avatarControls.start({
      scale: [1, 1.02, 1],
      rotate: [-1.5, 1.5, -1.5],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      },
    });
  }, [avatarControls]);

  const handleFollow = async () => {
    setIsFollowing(true);
    setShowConfetti(true);

    // Interrupt breathing with a pulse
    await avatarControls.start({
      scale: [1, 1.15, 1],
      rotate: [0, -5, 5, 0],
      transition: { duration: 0.5, ease: "circOut" },
    });

    // Resume breathing
    avatarControls.start({
      scale: [1, 1.02, 1],
      rotate: [-1.5, 1.5, -1.5],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      },
    });

    setTimeout(() => {
      setShowConfetti(false);
    }, 2500);
  };

  const handleUnpin = (id: string) => {
    setLocalPins((prev) => prev.filter((p) => p.id !== id));
  };

  const confirmUnpin = () => {
    if (pinToRemove) {
      handleUnpin(pinToRemove);
      setPinToRemove(null);
    }
  };

  const handleCopyLink = () => {
    const url = `https://bere.al/${user.username}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out ${user.displayName} on BeReal`,
          text: `Add ${user.displayName} (@${user.username}) on BeReal!`,
          url: `https://bere.al/${user.username}`,
        });
      } catch (err) {
        console.log("Error sharing", err);
      }
    } else {
      handleCopyLink();
    }
  };

  const splitDate = (dateStr: string) => {
    const parts = dateStr.split(" ");
    if (parts.length >= 3) {
      const year = parts.pop();
      return [parts.join(" "), year];
    }
    return [dateStr, ""];
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-black text-white h-full overflow-y-auto overflow-x-hidden font-sans scrollbar-hide"
    >
      {/* Cover Photo Section - Reduced Height Header */}
      <div className="relative w-full h-[350px] bg-[#1C1C1E] overflow-hidden z-0">
        {user.coverUrl && (
          <motion.img
            src={user.coverUrl}
            alt="Cover"
            className="w-full h-full object-cover will-change-transform origin-center"
            style={{
              y: coverY,
              scale: coverScale,
              opacity: coverOpacity,
              filter: coverBlur,
            }}
          />
        )}
        {/* Gradient Overlay for Header Icons and Content Blend */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent via-black/10 to-black" />

        {/* Top Actions - Absolute Positioned */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-30">
          <button
            onClick={onBack}
            className="w-10 h-10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 rounded-xl transition-colors bg-black/40"
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="w-10 h-10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 rounded-xl transition-colors bg-black/40"
            >
              <Share2 size={16} strokeWidth={2} />
            </button>
            <button className="w-10 h-10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 rounded-xl transition-colors bg-black/40">
              <MoreHorizontal size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Content - Overlapping Cover significantly */}
      <div className="px-4 relative z-20 -mt-40 pb-8">
        {/* Main Stats & Avatar Row */}
        <div className="flex items-end justify-between px-2 mb-3">
          {/* Following */}
          <div className="flex flex-col items-center w-24">
            <span className="text-xs text-muted">Following</span>
            <span className="text-2xl font-bold text-white">
              <AnimatedNumber value={user.followingCount} />
            </span>
          </div>

          {/* Avatar Center */}
          <motion.div
            className="relative"
            style={{ scale: avatarScale, y: avatarY }} // Apply pull-down transforms to whole container
          >
            <motion.div
              animate={avatarControls} // Apply breathing/pulse animation to just the card
              className="w-32 h-44 rounded-2xl bg-black border-2 border-white overflow-hidden relative z-10"
            >
              <FacePhotoTracker
                basePath="/faces/"
                fallbackImage={user.avatarUrl}
                width={128}
                height={176}
                className="w-full h-full rounded-xl"
              />
            </motion.div>

            {/* Streak Badge */}
            <div className="absolute -bottom-2 -left-4 z-20 bg-black border-2 border-white rounded-full px-2.5 py-1 flex items-center gap-1 shadow-[0_4px_12px_rgba(0,0,0,0.5)] transform -rotate-6">
              <Flame size={14} className="fill-orange-400 text-orange-800" />
              <span className="text-sm font-bold pt-[1px]">{user.streak}</span>
            </div>

            {/* Official Account Badge */}
            {isOfficial && (
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-1.5 rounded-full flex items-center gap-1.5 shadow-lg border-[3px] border-black transform z-20">
                <BadgeCheck size={24} strokeWidth={3} />
              </div>
            )}
          </motion.div>

          {/* Followers */}
          <div className="flex flex-col items-center w-24">
            <span className="text-xs text-muted">Followers</span>
            <span className="text-2xl font-bold text-white">
              <AnimatedNumber value={user.friendsCount} />
            </span>
          </div>
        </div>

        {/* Name & Info Centered */}
        <div className="text-center flex flex-col items-center px-4">
          <h1 className="text-[22px] font-bold text-white leading-tight">
            {user.displayName}
          </h1>

          <div className="flex items-center gap-2">
            <p className="text-[12px] leading-relaxed text-white/60 max-w-xs">
              {user.bio}
            </p>
          </div>

          <p className="text-sm text-gray-400 ">@{user.username}</p>

          {/* Follow Button */}
          {(isPrivate || isOfficial) && (
            <div className=" mt-2">
              <Button
                size="sm"
                fullWidth
                onClick={handleFollow}
                disabled={isFollowing}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="pt-6">
          {isPrivate ? (
            /* Private Profile View - Content Placeholder */
            <div className="flex flex-col items-center justify-center pt-10 text-center animate-in fade-in duration-500 delay-150">
              <div className="relative mb-4">
                <motion.div
                  className="absolute inset-0 bg-white/20 rounded-full blur-xl"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.2, 0.5, 0.2],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <Lock
                  size={32}
                  strokeWidth={1.5}
                  className="relative z-10 text-white/80"
                />
              </div>
              <h3 className="text-lg font-medium text-white/80">
                This account is private
              </h3>
            </div>
          ) : (
            <>
              {/* Pins / Highlights Section */}
              {(displayPins.length > 0 || isCurrentUser) && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <h3 className=" font-bold text-white">Highlights</h3>

                    {isCurrentUser && localPins.length > 0 ? (
                      <button
                        onClick={() => setIsEditingPins(!isEditingPins)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                          isEditingPins
                            ? "bg-white text-black"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        {isEditingPins ? "Done" : "Edit Pins"}
                      </button>
                    ) : (
                      !isOfficial &&
                      isCurrentUser && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                          <Users size={12} />
                          <span>Visible to your friends</span>
                        </div>
                      )
                    )}
                  </div>

                  {/* We reuse the Pin layout for Highlights */}
                  <div className="flex gap-2.5 overflow-x-auto no-scrollbar p-2 snap-x">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {displayPins.map((pin) => {
                        const [dateMain, dateYear] = splitDate(pin.date);
                        return (
                          <motion.div
                            key={pin.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{
                              opacity: 0,
                              scale: 0.5,
                              transition: { duration: 0.2 },
                            }}
                            className="relative snap-start shrink-0"
                          >
                            <div
                              className={`w-[110px] aspect-[9/15] rounded-xl overflow-hidden relative bg-gray-900 border border-white/5`}
                            >
                              <img
                                src={pin.imageUrl}
                                className="w-full h-full object-cover opacity-100"
                                alt="Pin"
                              />

                              {/* Selfie Overlay */}
                              {pin.selfieUrl && (
                                <div className="absolute top-2 left-2 w-[30px] h-[40px] rounded-md overflow-hidden border border-white z-10 shadow-sm -rotate-[2deg] bg-black">
                                  <img
                                    src={pin.selfieUrl}
                                    className="w-full h-full object-cover"
                                    alt="Selfie"
                                  />
                                </div>
                              )}

                              {/* Text Overlay Gradient */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                              <div className="absolute bottom-3 left-3">
                                <p className="text-[13px] font-bold text-white leading-none shadow-black drop-shadow-md">
                                  {dateMain}
                                </p>
                                {/* Hide year for highlights if it's fake/irrelevant, or show styled */}
                                <p className="text-[11px] font-medium text-white/80 mt-0.5 drop-shadow-md">
                                  {isOfficial ? "" : dateYear}
                                </p>
                              </div>

                              {isEditingPins && !isOfficial && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPinToRemove(pin.id);
                                  }}
                                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white z-20 shadow-sm hover:bg-red-600 transition-colors"
                                >
                                  <X size={14} strokeWidth={3} />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Friend Memories Grid - ALL POSTS */}
              {!isCurrentUser && !isPrivate && (
                <div className="mt-0">
                  <h3 className="font-bold text-white mb-3 px-1">Memories</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {memories.map((memory) => (
                      <div
                        key={memory.id}
                        className="relative aspect-[3/4] bg-gray-900 overflow-hidden group rounded-xl"
                      >
                        <img
                          src={memory.imageUrl}
                          alt="Memory"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {/* Selfie Overlay */}
                        {memory.selfieUrl && (
                          <div className="absolute top-2 left-2 w-[28%] aspect-[3/4] rounded-md overflow-hidden border border-white z-10 shadow-md -rotate-3 bg-black">
                            <img
                              src={memory.selfieUrl}
                              className="w-full h-full object-cover"
                              alt="Selfie"
                            />
                          </div>
                        )}

                        {/* Gradient for readability */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />

                        {/* RealMoji Count */}
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white/90 z-20">
                          <Smile size={14} strokeWidth={2.5} />
                          <span className="text-xs font-bold">
                            {memory.realMojiCount || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Memories Calendar for Current User */}
              {isCurrentUser && <MemoriesCalendar memories={memories} />}
            </>
          )}
        </div>
      </div>

      {/* Share Modal - Refined with Frosted Glass & Better QR */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="absolute inset-0 z-[100] flex items-end justify-center sm:items-center px-0 sm:px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ y: "100%", opacity: 0.5, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="relative w-full max-w-md bg-[#1C1C1E]/85 backdrop-blur-3xl rounded-t-[40px] sm:rounded-[40px] flex flex-col items-center shadow-2xl shadow-black border-t border-white/10 z-10 overflow-hidden pb-12 sm:pb-10"
            >
              {/* Indicator */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mt-3 mb-2 sm:hidden" />

              {/* Close Button */}
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="absolute top-5 right-5 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all z-20 backdrop-blur-md"
              >
                <X size={20} strokeWidth={2.5} />
              </button>

              <div className="pt-2 px-6 flex flex-col items-center w-full">
                <h3 className="text-white font-bold text-2xl mb-8 mt-4 tracking-tight">
                  Share Profile
                </h3>

                {/* QR Code Card */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="relative group cursor-pointer mb-10"
                  onClick={handleCopyLink}
                >
                  {/* Glow Effect behind card */}
                  <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/40 via-purple-500/40 to-pink-500/40 rounded-[40px] blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Card Body */}
                  <div className="relative bg-white rounded-[32px] p-6 w-[260px] flex flex-col items-center shadow-xl border border-white/20 ring-1 ring-black/5">
                    <div className="w-full aspect-square relative mb-4 bg-white rounded-2xl overflow-hidden">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=https://bere.al/${user.username}&bgcolor=ffffff&color=000000&margin=0`}
                        alt="Profile QR"
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                      {/* Avatar Overlay - Centered on QR */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[72px] h-[72px] bg-white rounded-full p-1.5 shadow-2xl ring-4 ring-white">
                          <img
                            src={user.avatarUrl}
                            className="w-full h-full object-cover rounded-full bg-gray-100"
                            alt="Avatar"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-black font-black text-2xl tracking-tight leading-none">
                        @{user.username}
                      </p>
                      <p className="text-gray-400 text-[10px] font-extrabold uppercase tracking-[0.2em]">
                        BEREAL.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Actions Row */}
                <div className="grid grid-cols-4 gap-3 w-full px-2">
                  {/* Instagram Stories */}
                  <button className="flex flex-col items-center gap-2 group cursor-pointer">
                    <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#f09433] via-[#bc1888] to-[#cc2366] flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-105 group-active:scale-95 transition-all duration-300 border border-white/10">
                      <Instagram size={30} strokeWidth={2} />
                    </div>
                    <span className="text-[11px] font-semibold text-white/90 tracking-wide">
                      Stories
                    </span>
                  </button>

                  {/* Snapchat */}
                  <button className="flex flex-col items-center gap-2 group cursor-pointer">
                    <div className="w-16 h-16 rounded-[22px] bg-[#FFFC00] flex items-center justify-center text-black shadow-lg shadow-yellow-500/20 border border-white/20 group-hover:scale-105 group-active:scale-95 transition-all duration-300">
                      <Ghost size={30} fill="black" strokeWidth={0} />
                    </div>
                    <span className="text-[11px] font-semibold text-white/90 tracking-wide">
                      Snapchat
                    </span>
                  </button>

                  {/* Native Share */}
                  <button
                    onClick={handleNativeShare}
                    className="flex flex-col items-center gap-2 group cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-[22px] bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-lg group-hover:scale-105 group-active:scale-95 hover:bg-white/20 transition-all duration-300">
                      <Share2 size={28} strokeWidth={2} />
                    </div>
                    <span className="text-[11px] font-semibold text-white/90 tracking-wide">
                      More
                    </span>
                  </button>

                  {/* Copy Link with Feedback Loop */}
                  <button
                    className="flex flex-col items-center gap-2 group cursor-pointer"
                    onClick={handleCopyLink}
                  >
                    <div
                      className={`w-16 h-16 rounded-[22px] flex items-center justify-center shadow-lg group-hover:scale-105 group-active:scale-95 transition-all duration-300 border border-white/10 ${
                        isCopied
                          ? "bg-white text-black"
                          : "bg-white/10 backdrop-blur-md hover:bg-white/20 text-white"
                      }`}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {isCopied ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                            transition={{ type: "spring", duration: 0.3 }}
                          >
                            <Check size={30} strokeWidth={3.5} />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="link"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <LinkIcon size={28} strokeWidth={2} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="text-[11px] font-semibold text-white/90 tracking-wide">
                      {isCopied ? "Copied" : "Link"}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog for Unpinning */}
      <AnimatePresence>
        {pinToRemove && (
          <div
            ref={modalContainerRef}
            className="z-[100] flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPinToRemove(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#1C1C1E] w-full max-w-sm rounded-3xl p-6 relative z-10 border border-white/10 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white text-center mb-2">
                Unpin Memory?
              </h3>
              <p className="text-white/60 text-center text-[15px] leading-relaxed mb-6">
                This will remove this memory from your profile highlights. You
                can always add it back later.
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  variant="danger"
                  fullWidth
                  onClick={confirmUnpin}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0"
                >
                  Remove
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setPinToRemove(null)}
                  className="bg-white/10 text-white hover:bg-white/20"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Render Confetti on Follow */}
      <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>
    </div>
  );
};

export default ProfileView;
