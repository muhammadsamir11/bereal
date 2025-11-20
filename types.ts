import React from 'react';

export interface User {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  coverUrl?: string;
  location: string;
  joinDate: string;
  isVerified?: boolean;
  isFriend?: boolean;
  streak?: number;
  friendsCount?: number;
  memoriesCount?: number;
  followingCount?: number;
}

export interface Memory {
  id: string;
  date: string; // ISO date
  imageUrl: string;
  hasRealMoji?: boolean;
  selfieUrl?: string;
  realMojiCount?: number;
}

export enum View {
  HOME = 'HOME',
  FRIENDS = 'FRIENDS',
  CAMERA = 'CAMERA',
  INBOX = 'INBOX',
  PROFILE = 'PROFILE',
  OTHER_PROFILE = 'OTHER_PROFILE',
  EDIT_PROFILE = 'EDIT_PROFILE'
}

export interface NavItem {
  view: View;
  icon: React.ComponentType<any>;
  label?: string;
}