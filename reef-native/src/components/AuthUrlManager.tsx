/**
 * AuthUrlManager — manage authorized dApp domains.
 * Mirrors auth_url_list_modal.dart from Flutter.
 *
 * Shows a list of domains that have been approved/denied access.
 * Users can toggle access on/off or delete entries entirely.
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Switch,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import * as Storage from '../services/StorageService';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

interface AuthUrlEntry {
  url: string;
  isAllowed: boolean;
}

interface AuthUrlManagerProps {
  onBack: () => void;
}

export default function AuthUrlManager({onBack}: AuthUrlManagerProps) {
  const {t} = useTranslation();
  const [entries, setEntries] = useState<AuthUrlEntry[]>([]);
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  const loadEntries = useCallback(() => {
    const allUrls = Storage.getAllAuthUrls();
    const parsed: AuthUrlEntry[] = Object.entries(allUrls).map(
      ([url, data]) => {
        try {
          const parsed = JSON.parse(data);
          return {url, isAllowed: parsed.isAllowed ?? true};
        } catch {
          return {url, isAllowed: true};
        }
      },
    );
    setEntries(parsed);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleToggle = (url: string, newValue: boolean) => {
    Storage.saveAuthUrl(url, JSON.stringify({isAllowed: newValue}));
    setEntries(prev =>
      prev.map(e => (e.url === url ? {...e, isAllowed: newValue} : e)),
    );
  };

  const handleDelete = (url: string) => {
    Alert.alert(
      t('delete'),
      `Remove access record for ${url}?`,
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            Storage.deleteAuthUrl(url);
            setEntries(prev => prev.filter(e => e.url !== url));
          },
        },
      ],
    );
  };

  return (
    <View style={{flex: 1, backgroundColor: isLight ? '#fff7fe' : Colors.primaryBg}}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          gap: 12,
        }}>
        <TouchableOpacity onPress={onBack}>
          <Text style={{color: isLight ? '#4e00cd' : Colors.purple, fontSize: 16}}>← Back</Text>
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: '700',
            color: isLight ? '#2c024d' : Colors.text,
          }}>
          Authorized Websites
        </Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={item => item.url}
        renderItem={({item}) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isLight ? 'rgba(255,255,255,0.5)' : Colors.cardBg,
              marginHorizontal: 16,
              marginBottom: 4,
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: isLight ? 'rgba(203,195,218,0.15)' : Colors.grey,
            }}>
            {/* URL */}
            <View style={{flex: 1, marginRight: 12}}>
              <Text
                style={{fontSize: 14, color: isLight ? '#2c024d' : Colors.text}}
                numberOfLines={1}>
                {item.url}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: item.isAllowed ? Colors.green : Colors.error,
                  marginTop: 2,
                }}>
                {item.isAllowed ? 'Allowed' : 'Blocked'}
              </Text>
            </View>

            {/* Toggle */}
            <Switch
              value={item.isAllowed}
              onValueChange={val => handleToggle(item.url, val)}
              trackColor={{false: Colors.grey, true: (isLight ? '#4e00cd' : Colors.purple) + '60'}}
              thumbColor={item.isAllowed ? (isLight ? '#4e00cd' : Colors.purple) : '#f4f3f4'}
            />

            {/* Delete */}
            <TouchableOpacity
              onPress={() => handleDelete(item.url)}
              style={{padding: 8, marginLeft: 4}}>
              <Text style={{fontSize: 16, color: Colors.error}}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={{padding: 40, alignItems: 'center'}}>
            <Text style={{fontSize: 36, marginBottom: 12}}>🌐</Text>
            <Text
              style={{
                color: isLight ? '#494457' : Colors.textLight,
                fontSize: 14,
                textAlign: 'center',
              }}>
              No authorized websites yet.{'\n'}Websites will appear here when
              you approve access from the dApp browser.
            </Text>
          </View>
        }
        contentContainerStyle={{paddingBottom: 20}}
      />
    </View>
  );
}
