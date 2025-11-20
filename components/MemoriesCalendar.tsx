import React, { useState, useEffect } from 'react';
import { Memory } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Smile, X, Share2, MapPin, Calendar } from 'lucide-react';

interface MemoriesCalendarProps {
  memories: Memory[];
}

const MemoriesCalendar: React.FC<MemoriesCalendarProps> = ({ memories }) => {
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  // Disable scroll when modal is open
  useEffect(() => {
    if (selectedMemory) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedMemory]);

  // Construct a list of 14 days ending today.
  const calendarDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i)); // Start 13 days ago
    return {
      dateObj: d,
      dayNum: d.getDate(),
      isoDate: d.toISOString().split('T')[0],
      fullDate: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    };
  });

  return (
    <div className="w-full">
      {/* Header Outside */}
      <div className="flex justify-between items-end px-1 mb-4">
         <h3 className="font-bold text-white">Memories</h3>
         <div className="flex items-center gap-1 text-xs text-gray-400 font-medium mb-1">
             <Lock size={12} />
             <span>Only visible to you</span>
         </div>
      </div>

      {/* Dark Gray Container */}
      <div className="bg-[#1C1C1E] rounded-2xl p-4">
          <p className="text-sm text-gray-400 font-medium mb-4">Last 14 days</p>
          
          {/* The Grid */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {calendarDays.map((day, index) => {
                const memory = memories.find(m => m.date === day.isoDate);
                
                return (
                  <motion.div
                    key={day.isoDate}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => memory && setSelectedMemory(memory)}
                    className={`aspect-3/2 rounded-md relative flex items-center justify-center overflow-hidden ${
                        memory 
                        ? 'borde border-white bg-black cursor-pointer hover:brightness-110 active:scale-95 transition-all' 
                        : 'border border-white/10 bg-white/5'
                    }`}
                  >
                     {memory ? (
                         // Day has a memory -> Show Image
                         <div className="w-full h-full relative group">
                            <motion.img 
                                layoutId={`img-${memory.id}`}
                                src={memory.imageUrl} 
                                alt="Memory" 
                                className="w-full h-full object-cover" 
                            />
                            
                            {/* RealMoji Indicator */}
                            {memory.hasRealMoji && (
                                <div className="absolute bottom-1 right-1 w-4 h-4 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10 z-10 pointer-events-none">
                                    <Smile size={10} className="text-white" strokeWidth={2.5} />
                                </div>
                            )}

                            {/* Interactive Overlay - Date Always Visible */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors duration-300">
                                 <span className="text-white/90 font-bold drop-shadow-md shadow-black">{day.dayNum}</span>
                            </div>
                         </div>
                     ) : (
                         // Day has NO memory -> Show Number
                         <span className="text-xl font-semibold text-white/30">{day.dayNum}</span>
                     )}
                  </motion.div>
                );
            })}
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 border border-white/5"
          >
              <Calendar size={16} />
              View all memories
          </motion.button>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedMemory && (
           <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center">
               {/* Backdrop */}
               <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedMemory(null)}
                  className="absolute inset-0 w-full h-full bg-black/95 backdrop-blur-xl"
               />

               {/* Card Container */}
               <motion.div
                  layoutId={`card-${selectedMemory.id}`}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  // Updated to be taller (85vh) and cover to fill
                  className="relative w-full max-w-sm h-[85vh] bg-gray-900 rounded-[24px] overflow-hidden shadow-2xl border border-white/10"
               >
                  {/* Main Image */}
                  <div className="absolute inset-0 z-0">
                      <motion.img 
                         layoutId={`img-${selectedMemory.id}`}
                         src={selectedMemory.imageUrl} 
                         className="w-full h-full object-cover"
                         alt="Main Memory"
                      />
                  </div>

                  {/* Selfie PiP - Top Left */}
                  {selectedMemory.selfieUrl && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: -3 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="absolute top-4 left-4 w-[100px] aspect-[3/4] rounded-2xl border border-white bg-black overflow-hidden z-10"
                      >
                          <img src={selectedMemory.selfieUrl} className="w-full h-full object-cover" alt="Selfie" />
                      </motion.div>
                  )}

                  {/* Close Button - Top Right */}
                  <button 
                    onClick={() => setSelectedMemory(null)}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-20 border border-white/10"
                  >
                     <X size={20} strokeWidth={2.5} />
                  </button>

                  {/* Bottom Meta Info - Date/Loc Bottom Left, Share Bottom Right */}
                  <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-20 z-10">
                      <div className="flex justify-between items-end">
                          <div className="space-y-1">
                               <p className="text-white font-bold text-xl tracking-wide">
                                   {new Date(selectedMemory.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                               </p>
                               <p className="text-white/70 text-sm font-medium flex items-center gap-1.5">
                                   <MapPin size={14} className="text-white/60" />
                                   Austin, Texas
                                   <span className="mx-1 text-white/30">•</span>
                                   12:42 PM
                               </p>
                          </div>
                      </div>
                  </div>
               </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MemoriesCalendar;