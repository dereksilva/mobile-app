/**
 * StorageService — replaces Flutter's Hive boxes + flutter_secure_storage.
 *
 * MMKV: fast key-value for settings, metadata, auth URLs, JWTs.
 * Keychain: secure enclave for account mnemonics/JSON and password hash.
 */

import {MMKV} from 'react-native-mmkv';
import * as Keychain from 'react-native-keychain';
import bcrypt from 'bcryptjs';
import {StorageKey, StoredAccount} from '../types';

// --- MMKV instances (mirrors Hive boxes) ---

const settingsStorage = new MMKV({id: 'settings'});
const metadataStorage = new MMKV({id: 'metadata'});
const authUrlsStorage = new MMKV({id: 'authUrls'});
const jwtsStorage = new MMKV({id: 'jwts'});
const accountIndexStorage = new MMKV({id: 'accountIndex'});

// --- Settings (general key-value) ---

export function getValue(key: StorageKey): string | undefined {
  return settingsStorage.getString(key);
}

export function setValue(key: StorageKey, value: string): void {
  settingsStorage.set(key, value);
}

export function getBoolValue(key: StorageKey): boolean {
  return settingsStorage.getBoolean(key) ?? false;
}

export function setBoolValue(key: StorageKey, value: boolean): void {
  settingsStorage.set(key, value);
}

export function deleteValue(key: StorageKey): void {
  settingsStorage.delete(key);
}

// --- Account Storage (secure) ---

const ACCOUNT_INDEX_KEY = 'account_addresses';
const KEYCHAIN_SERVICE_PREFIX = 'reef_account_';

function getAccountAddresses(): string[] {
  const raw = accountIndexStorage.getString(ACCOUNT_INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setAccountAddresses(addresses: string[]): void {
  accountIndexStorage.set(ACCOUNT_INDEX_KEY, JSON.stringify(addresses));
}

export async function saveAccount(account: StoredAccount): Promise<void> {
  const service = KEYCHAIN_SERVICE_PREFIX + account.address;
  await Keychain.setGenericPassword(
    account.address,
    JSON.stringify(account),
    {service},
  );

  const addresses = getAccountAddresses();
  if (!addresses.includes(account.address)) {
    addresses.push(account.address);
    setAccountAddresses(addresses);
  }
}

export async function getAccount(
  address: string,
): Promise<StoredAccount | null> {
  const service = KEYCHAIN_SERVICE_PREFIX + address;
  const result = await Keychain.getGenericPassword({service});
  if (!result) return null;
  try {
    return JSON.parse(result.password);
  } catch {
    return null;
  }
}

export async function getAllAccounts(): Promise<StoredAccount[]> {
  const addresses = getAccountAddresses();
  const accounts: StoredAccount[] = [];
  for (const address of addresses) {
    const account = await getAccount(address);
    if (account) accounts.push(account);
  }
  return accounts;
}

export async function deleteAccount(address: string): Promise<void> {
  const service = KEYCHAIN_SERVICE_PREFIX + address;
  await Keychain.resetGenericPassword({service});

  const addresses = getAccountAddresses().filter(a => a !== address);
  setAccountAddresses(addresses);
}

// --- Password (secure, bcrypt) ---

const PASSWORD_SERVICE = 'reef_app_password';
const BCRYPT_ROUNDS = 10;

export async function savePasswordSecure(password: string): Promise<void> {
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await Keychain.setGenericPassword('reef_user', hash, {
    service: PASSWORD_SERVICE,
  });
}

export async function verifyPasswordSecure(password: string): Promise<boolean> {
  const result = await Keychain.getGenericPassword({service: PASSWORD_SERVICE});
  if (!result) return false;
  return bcrypt.compare(password, result.password);
}

export async function hasPasswordSet(): Promise<boolean> {
  const result = await Keychain.getGenericPassword({service: PASSWORD_SERVICE});
  return !!result;
}

export async function removePassword(): Promise<void> {
  await Keychain.resetGenericPassword({service: PASSWORD_SERVICE});
}

// --- Metadata ---

export function getMetadata(key: string): string | undefined {
  return metadataStorage.getString(key);
}

export function saveMetadata(key: string, value: string): void {
  metadataStorage.set(key, value);
}

export function deleteMetadata(key: string): void {
  metadataStorage.delete(key);
}

// --- Auth URLs ---

export function getAuthUrl(url: string): string | undefined {
  return authUrlsStorage.getString(url);
}

export function saveAuthUrl(url: string, data: string): void {
  authUrlsStorage.set(url, data);
}

export function getAllAuthUrls(): Record<string, string> {
  const keys = authUrlsStorage.getAllKeys();
  const result: Record<string, string> = {};
  for (const key of keys) {
    const val = authUrlsStorage.getString(key);
    if (val) result[key] = val;
  }
  return result;
}

export function deleteAuthUrl(url: string): void {
  authUrlsStorage.delete(url);
}

// --- JWTs ---

export function getJwt(key: string): string | undefined {
  return jwtsStorage.getString(key);
}

export function saveJwt(key: string, token: string): void {
  jwtsStorage.set(key, token);
}

export function deleteJwt(key: string): void {
  jwtsStorage.delete(key);
}
