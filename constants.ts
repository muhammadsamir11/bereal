
import { User, Memory } from './types';

export const CURRENT_USER: User = {
  id: 'u1',
  username: 'abbygreen',
  displayName: 'Abby',
  bio: 'Living life in the moment.',
  // Stable high-quality portrait (Abby)
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1000&q=80',
  coverUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80', // Lake/Landscape
  location: 'Austin, USA',
  joinDate: '2022',
  streak: 142,
  friendsCount: 48,
  memoriesCount: 142,
  followingCount: 125
};

export const FRIEND_USER: User = {
  id: 'u2',
  username: 'sarah_snaps',
  displayName: 'Sarah Jenkins',
  bio: 'Living life one late BeReal at a time.',
  // Stable high-quality portrait (Sarah)
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  coverUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80', // Foggy Nature
  location: 'New York, NY',
  joinDate: '2023',
  isFriend: true,
  streak: 12,
  friendsCount: 156,
  memoriesCount: 89,
  followingCount: 230
};

export const OFFICIAL_USER: User = {
  id: 'u3',
  username: 'nasa',
  displayName: 'NASA',
  bio: 'Exploring the universe. 🚀🌌',
  // Earth from space (NASA)
  avatarUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  coverUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80', // Space
  location: 'Washington, D.C.',
  joinDate: '2024',
  isVerified: true,
  isFriend: false,
  streak: 0,
  friendsCount: 4500000,
  memoriesCount: 312,
  followingCount: 12
};

export const NON_FRIEND_USER: User = {
  id: 'u4',
  username: 'james_doe',
  displayName: 'James Doe',
  bio: 'Just here for the memories.',
  // Man portrait
  avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
  coverUrl: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&w=1200&q=80', // Abstract Weather
  location: 'Chicago, IL',
  joinDate: '2023',
  isVerified: false,
  isFriend: false,
  streak: 0,
  friendsCount: 14,
  memoriesCount: 5,
  followingCount: 45
};

// Verified Unsplash IDs for memories to ensure they load
const MEMORY_IMAGES = [
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80', // Paris
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80', // Friends
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80', // Man looking
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80', // Woman
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80', // Product
  'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?auto=format&fit=crop&w=600&q=80', // City
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80', // Laptop/Tech
  'https://images.unsplash.com/photo-1605218427368-35b8168f4c78?auto=format&fit=crop&w=600&q=80'  // Solo travel
];

const SELFIE_IMAGES = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
];

// Generate last 14 days of memories specifically for the grid view
const generateMemories = (): Memory[] => {
  const memories: Memory[] = [];
  const today = new Date();
  
  // Create specific pattern to match reference roughly (some days missed)
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Simulate memories on specific relative days
    // Skip days 0, 4, 7, 12 to show numbers in grid
    if (![0, 4, 7, 10, 12].includes(i)) { 
      memories.push({
        id: `m-${i}`,
        date: dateStr,
        imageUrl: MEMORY_IMAGES[i % MEMORY_IMAGES.length],
        hasRealMoji: Math.random() > 0.7,
        selfieUrl: SELFIE_IMAGES[i % SELFIE_IMAGES.length],
        realMojiCount: Math.floor(Math.random() * 20) + 2
      });
    }
  }
  return memories;
};

export const MOCK_MEMORIES = generateMemories();

export const PINNED_MEMORIES: Memory[] = [
  {
    id: 'p1',
    date: 'January 12 2022',
    imageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=600&q=80', // Dog
    selfieUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    realMojiCount: 12
  },
  {
    id: 'p2',
    date: 'April 13 2022',
    imageUrl: 'https://images.unsplash.com/photo-1543373014-cfe4f4bc1cdf?auto=format&fit=crop&w=600&q=80', // Tennis
    selfieUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    realMojiCount: 8
  },
  {
    id: 'p3',
    date: 'June 25 2023',
    imageUrl: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?auto=format&fit=crop&w=600&q=80', // Nature
    selfieUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    realMojiCount: 5
  },
  {
    id: 'p4',
    date: 'July 04 2023',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80', // Fireworks
    selfieUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
    realMojiCount: 15
  },
  {
    id: 'p5',
    date: 'August 19 2023',
    imageUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=600&q=80', // Cinque Terre / Travel
    selfieUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=200&q=80',
    realMojiCount: 42
  },
  {
    id: 'p6',
    date: 'October 31 2023',
    imageUrl: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?auto=format&fit=crop&w=600&q=80', // Pumpkin / Halloween
    selfieUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    realMojiCount: 9
  }
];

// Verified working Unsplash IDs for space highlights with fresh tokens
export const HIGHLIGHT_IMAGES = [
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80', // Earth
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=400&q=80', // Astronaut
  'https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=400&q=80', // Rocket
  'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=400&q=80', // Mars
  'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=400&q=80', // Galaxy
  'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=400&q=80'  // Stars
];

// Reliable portrait placeholders
export const HIGHLIGHT_SELFIES = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?auto=format&fit=crop&w=200&q=80'
];