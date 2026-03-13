import {create} from 'zustand';

export enum AppPage {
  HOME = 'Home',
  ACCOUNTS = 'Accounts',
  POOLS = 'Pools',
  SETTINGS = 'Settings',
}

export enum HomeTab {
  TOKENS = 0,
  NFTS = 1,
  ACTIVITY = 2,
}

interface NavigationState {
  currentPage: AppPage;
  homeTabIndex: HomeTab;

  setCurrentPage: (page: AppPage) => void;
  setHomeTabIndex: (index: HomeTab) => void;
}

export const useNavigationStore = create<NavigationState>(set => ({
  currentPage: AppPage.HOME,
  homeTabIndex: HomeTab.TOKENS,

  setCurrentPage: (page: AppPage) => set({currentPage: page}),
  setHomeTabIndex: (index: HomeTab) => set({homeTabIndex: index}),
}));
