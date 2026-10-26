import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../services/api';
import type { User } from '../types';
import { resetAllStores } from './storeRegistry';
import { useBookmarkStore } from './bookmarkStore';
import { useRecentReportsStore } from './recentReportsStore';
import { useColorStore } from './colorStore';
import { CommonActions } from '@react-navigation/native';
import { navigationRef } from '../navigation/navigationRef';

export interface SavedAccount {
  accountId: string;     // Unique identifier (user.id as string)
  username: string;
  name: string;
  isSubuser: boolean;
  role: string;          // e.g. "Admin" or "Sales User" derived from isSubuser
  companyName: string;   // For UI display in switcher
}

interface AuthState {
  activeAccountId: string | null;
  savedAccounts: SavedAccount[];
  isSwitchingAccount: boolean;
  isLoggedIn: boolean;   // true if activeAccountId && its token exists
  isLoading: boolean;

  /** When true, session token is kept but UI requires credentials to enter the app. */
  isAppLocked: boolean;
  /** Persisted preference — bank-style lock on cold start / return from background. */
  appLockEnabled: boolean;
  
  // Backward compatibility wrapper (used by other stores temporarily if they need user info)
  user: User | null;
  token: string | null;

  // Actions
  loginAndAddAccount: (username: string, password: string) => Promise<boolean>;
  switchAccount: (accountId: string) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  deactivateSession: () => Promise<void>; 
  restoreSessions: () => Promise<void>; 
  updateProfile: (updates: Partial<User>) => Promise<void>; // Retained for compatibility
  refreshProfile: () => Promise<void>;

  lockApp: () => void;
  unlockApp: (username: string, password: string) => Promise<boolean>;
  setAppLockEnabled: (enabled: boolean) => Promise<void>;

  // Helpers
  getActiveAccount: () => SavedAccount | null;
}

const LEGACY_TOKEN_KEY = 'zeel_auth_token';
const LEGACY_USER_KEY = 'zeel_user_data';

const SAVED_ACCOUNTS_KEY = 'zeel_saved_accounts';
const ACTIVE_ACCOUNT_ID_KEY = 'zeel_active_account_id';
const APP_LOCK_ENABLED_KEY = 'zeel_app_lock_enabled';

const getTokenKey = (id: string) => `zeel_token_${id}`;
const getUserKey = (id: string) => `zeel_user_data_${id}`;

const usernamesMatch = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

const extractAccountInfo = (user: User): SavedAccount => {
  return {
    accountId: user.id.toString(),
    username: user.username,
    name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
    isSubuser: !!user.isSubuser,
    role: user.isSubuser ? 'Sub User' : 'Admin',
    companyName: user.companyName || user.profile?.companyName || 'Unknown Company',
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  activeAccountId: null,
  savedAccounts: [],
  isSwitchingAccount: false,
  isLoggedIn: false,
  isLoading: false,
  isAppLocked: false,
  appLockEnabled: false,
  user: null,
  token: null,

  getActiveAccount: () => {
    const { activeAccountId, savedAccounts } = get();
    return savedAccounts.find(a => a.accountId === activeAccountId) || null;
  },

  restoreSessions: async () => {
    try {
      const lockPref = await AsyncStorage.getItem(APP_LOCK_ENABLED_KEY);
      const appLockEnabled = lockPref === null ? false : lockPref === '1';

      // 1. Migration Step
      const legacyToken = await SecureStore.getItemAsync(LEGACY_TOKEN_KEY);
      const legacyUserStr = await SecureStore.getItemAsync(LEGACY_USER_KEY);
      let accountsStr = await SecureStore.getItemAsync(SAVED_ACCOUNTS_KEY);

      if (legacyToken && legacyUserStr && !accountsStr) {
        // Run migration
        const legacyUser = JSON.parse(legacyUserStr) as User;
        const accountInfo = extractAccountInfo(legacyUser);
        const accountId = accountInfo.accountId;

        await SecureStore.setItemAsync(getTokenKey(accountId), legacyToken);
        await SecureStore.setItemAsync(getUserKey(accountId), legacyUserStr);
        await SecureStore.setItemAsync(SAVED_ACCOUNTS_KEY, JSON.stringify([accountInfo]));
        await SecureStore.setItemAsync(ACTIVE_ACCOUNT_ID_KEY, accountId);

        // Migrate scoped storage data
        const oldBookmarks = await SecureStore.getItemAsync('zeel_dashboard_bookmarks');
        if (oldBookmarks) {
          await SecureStore.setItemAsync(`zeel_dashboard_bookmarks_${accountId}`, oldBookmarks);
          await SecureStore.deleteItemAsync('zeel_dashboard_bookmarks');
        }

        const oldRecents = await SecureStore.getItemAsync('zeel_recent_reports');
        if (oldRecents) {
          await SecureStore.setItemAsync(`zeel_recent_reports_${accountId}`, oldRecents);
          await SecureStore.deleteItemAsync('zeel_recent_reports');
        }

        const oldColors = await AsyncStorage.getItem('zeel_order_colors');
        if (oldColors) {
          await AsyncStorage.setItem(`zeel_order_colors_${accountId}`, oldColors);
          await AsyncStorage.removeItem('zeel_order_colors');
        }

        // Leave LEGACY_TOKEN_KEY for rollback mitigation for one version (just don't delete it yet).
        // await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY);
        // await SecureStore.deleteItemAsync(LEGACY_USER_KEY);

        accountsStr = JSON.stringify([accountInfo]);
      }

      // 2. Load Multi-Account Data
      if (accountsStr) {
        const savedAccounts = JSON.parse(accountsStr) as SavedAccount[];
        const activeAccountId = await SecureStore.getItemAsync(ACTIVE_ACCOUNT_ID_KEY);

        if (activeAccountId && savedAccounts.some(a => a.accountId === activeAccountId)) {
          const token = await SecureStore.getItemAsync(getTokenKey(activeAccountId));
          const userStr = await SecureStore.getItemAsync(getUserKey(activeAccountId));
          
          if (token && userStr) {
            const user = JSON.parse(userStr) as User;
            set({ 
              savedAccounts, 
              activeAccountId, 
              isLoggedIn: true,
              isAppLocked: appLockEnabled,
              appLockEnabled,
              user,
              token
            });

            await Promise.all([
              useBookmarkStore.getState().loadBookmarks(activeAccountId),
              useRecentReportsStore.getState().loadRecents(activeAccountId),
              useColorStore.getState().load(activeAccountId)
            ]);

            // Background refresh to get latest permissions
            get().refreshProfile();
            return;
          }
        }
        // Have accounts, but none active (or token lost)
        set({
          savedAccounts,
          activeAccountId: null,
          isLoggedIn: false,
          isAppLocked: false,
          appLockEnabled,
        });
        return;
      }

      set({ appLockEnabled });
    } catch {
      // Error loading sessions
    }
    set({ savedAccounts: [], activeAccountId: null, isLoggedIn: false, isAppLocked: false });
  },

  loginAndAddAccount: async (username, password) => {
    if (!username.trim() || !password.trim()) return false;
    
    set({ isLoading: true });
    try {
      const { token } = await authApi.login(username.trim(), password);
      const user = await authApi.getProfile(token);
      const accountInfo = extractAccountInfo(user);
      const accountId = accountInfo.accountId;

      const { savedAccounts } = get();
      const updatedAccounts = savedAccounts.filter(a => a.accountId !== accountId);
      updatedAccounts.push(accountInfo);

      // Save to persistent storage
      await SecureStore.setItemAsync(getTokenKey(accountId), token);
      await SecureStore.setItemAsync(getUserKey(accountId), JSON.stringify(user));
      await SecureStore.setItemAsync(SAVED_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
      await SecureStore.setItemAsync(ACTIVE_ACCOUNT_ID_KEY, accountId);

      // If this is the FIRST account, write to legacy keys for rollback safety
      if (updatedAccounts.length === 1) {
        await SecureStore.setItemAsync(LEGACY_TOKEN_KEY, token);
        await SecureStore.setItemAsync(LEGACY_USER_KEY, JSON.stringify(user));
      }

      set({ 
        savedAccounts: updatedAccounts, 
        activeAccountId: accountId, 
        isLoggedIn: true,
        isAppLocked: false,
        isLoading: false,
        user,
        token
      });

      // We just logged into a new account, we should clear old stores and load its scoped data
      resetAllStores();
      await Promise.all([
        useBookmarkStore.getState().loadBookmarks(accountId),
        useRecentReportsStore.getState().loadRecents(accountId),
        useColorStore.getState().load(accountId)
      ]);

      return true;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  switchAccount: async (accountId: string) => {
    const { savedAccounts, appLockEnabled } = get();
    if (!savedAccounts.some(a => a.accountId === accountId)) return;

    set({ isSwitchingAccount: true });

    try {
      const token = await SecureStore.getItemAsync(getTokenKey(accountId));
      const userStr = await SecureStore.getItemAsync(getUserKey(accountId));

      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        await SecureStore.setItemAsync(ACTIVE_ACCOUNT_ID_KEY, accountId);

        // Update state — require lock again when switching into a saved session
        set({ 
          activeAccountId: accountId,
          user,
          token,
          isLoggedIn: true,
          isAppLocked: appLockEnabled,
        });

        // Clear existing store contexts and fetch new account's data
        resetAllStores();
        await Promise.all([
          useBookmarkStore.getState().loadBookmarks(accountId),
          useRecentReportsStore.getState().loadRecents(accountId),
          useColorStore.getState().load(accountId)
        ]);

        // Background refresh to get latest permissions
        get().refreshProfile();

        if (navigationRef.isReady()) {
          navigationRef.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: appLockEnabled ? 'AppLock' : 'App' }],
            })
          );
        }
      }
    } finally {
      set({ isSwitchingAccount: false });
    }
  },

  removeAccount: async (accountId: string) => {
    const { savedAccounts, activeAccountId } = get();
    
    // Clear credentials
    await SecureStore.deleteItemAsync(getTokenKey(accountId));
    await SecureStore.deleteItemAsync(getUserKey(accountId));
    
    // Clear scoped data
    await SecureStore.deleteItemAsync(`zeel_dashboard_bookmarks_${accountId}`);
    await SecureStore.deleteItemAsync(`zeel_recent_reports_${accountId}`);
    await AsyncStorage.removeItem(`zeel_order_colors_${accountId}`);

    const updatedAccounts = savedAccounts.filter(a => a.accountId !== accountId);
    await SecureStore.setItemAsync(SAVED_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));

    if (activeAccountId === accountId) {
      // Currently active account was removed
      resetAllStores();

      if (updatedAccounts.length > 0) {
        // Fallback to first available account
        const nextAccount = updatedAccounts[0];
        await get().switchAccount(nextAccount.accountId);
      } else {
        // No accounts left
        await SecureStore.deleteItemAsync(ACTIVE_ACCOUNT_ID_KEY);
        set({ 
          savedAccounts: [], 
          activeAccountId: null, 
          isLoggedIn: false,
          isAppLocked: false,
          user: null,
          token: null
        });
      }
    } else {
      set({ savedAccounts: updatedAccounts });
    }
  },

  deactivateSession: async () => {
    resetAllStores();
    set({ 
      activeAccountId: null,
      isLoggedIn: false,
      isAppLocked: false,
      user: null,
      token: null
    });
    await SecureStore.deleteItemAsync(ACTIVE_ACCOUNT_ID_KEY);
  },

  lockApp: () => {
    const { isLoggedIn, appLockEnabled, isAppLocked } = get();
    if (!isLoggedIn || !appLockEnabled || isAppLocked) return;
    set({ isAppLocked: true });
  },

  unlockApp: async (username, password) => {
    if (!username.trim() || !password.trim()) return false;

    const { user, activeAccountId } = get();
    if (!user || !activeAccountId) return false;

    // Must unlock the currently locked session — not a different account
    if (!usernamesMatch(username, user.username)) {
      return false;
    }

    set({ isLoading: true });
    try {
      const { token } = await authApi.login(username.trim(), password);
      const profile = await authApi.getProfile(token);

      if (profile.id.toString() !== activeAccountId) {
        set({ isLoading: false });
        return false;
      }

      await SecureStore.setItemAsync(getTokenKey(activeAccountId), token);
      await SecureStore.setItemAsync(getUserKey(activeAccountId), JSON.stringify(profile));

      set({
        token,
        user: profile,
        isAppLocked: false,
        isLoading: false,
      });
      return true;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  setAppLockEnabled: async (enabled: boolean) => {
    await AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, enabled ? '1' : '0');
    set({
      appLockEnabled: enabled,
      // Turning off clears the current lock; turning on does not lock mid-session
      isAppLocked: enabled ? get().isAppLocked : false,
    });
  },

  updateProfile: async (updates: Partial<User>) => {
    const { user, activeAccountId } = get();
    if (!user || !activeAccountId) return;
    
    const updated: User = { ...user, ...updates };
    set({ user: updated });
    
    try {
      await SecureStore.setItemAsync(getUserKey(activeAccountId), JSON.stringify(updated));
      
      // Update saved accounts list UI cache
      const { savedAccounts } = get();
      const updatedAccounts = savedAccounts.map(a => 
        a.accountId === activeAccountId ? extractAccountInfo(updated) : a
      );
      set({ savedAccounts: updatedAccounts });
      await SecureStore.setItemAsync(SAVED_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
    } catch {
      // Ignore
    }
  },

  refreshProfile: async () => {
    const { token, activeAccountId, savedAccounts } = get();
    if (!token || !activeAccountId) return;

    try {
      const user = await authApi.getProfile(token);
      if (get().activeAccountId !== activeAccountId) return;
      const accountInfo = extractAccountInfo(user);

      // Update persistent storage
      await SecureStore.setItemAsync(getUserKey(activeAccountId), JSON.stringify(user));
      
      const updatedAccounts = savedAccounts.map(a => 
        a.accountId === activeAccountId ? accountInfo : a
      );
      await SecureStore.setItemAsync(SAVED_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));

      // Update state
      set({ 
        user,
        savedAccounts: updatedAccounts
      });
    } catch {
      // Silently fail if network error
    }
  },
}));
