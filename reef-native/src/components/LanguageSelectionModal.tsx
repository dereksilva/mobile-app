/**
 * LanguageSelectionModal — select app language.
 * Mirrors language_selection_modal.dart from Flutter.
 *
 * Supported languages: English, Hindi, Italian.
 * Updates the i18next language and persists to storage.
 */

import React from 'react';
import {View, Text, TouchableOpacity, Modal} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useLocaleStore, SupportedLanguage} from '../stores/useLocaleStore';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

interface LanguageSelectionModalProps {
  visible: boolean;
  onClose: () => void;
}

interface LanguageOption {
  code: SupportedLanguage;
  labelKey: string;
  nativeLabel: string;
}

const LANGUAGES: LanguageOption[] = [
  {code: 'en', labelKey: 'english', nativeLabel: 'English'},
  {code: 'hi', labelKey: 'hindi', nativeLabel: 'हिन्दी'},
  {code: 'it', labelKey: 'italian', nativeLabel: 'Italiano'},
];

export default function LanguageSelectionModal({
  visible,
  onClose,
}: LanguageSelectionModalProps) {
  const {t, i18n} = useTranslation();
  const selectedLanguage = useLocaleStore(s => s.selectedLanguage);
  const setLanguage = useLocaleStore(s => s.setLanguage);
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.4)',
        }}>
        <View
          style={{
            backgroundColor: isLight ? '#fff7fe' : Colors.cardBg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            paddingBottom: 40,
          }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}>
            <Text style={{fontSize: 20, fontWeight: '700', color: isLight ? '#2c024d' : Colors.text}}>
              {t('select_language')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{fontSize: 28, color: isLight ? '#494457' : Colors.textLight}}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Language options */}
          {LANGUAGES.map(lang => {
            const isSelected = selectedLanguage === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                onPress={() => handleSelectLanguage(lang.code)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: isSelected
                    ? (isLight ? 'rgba(78,0,205,0.06)' : Colors.purple + '10')
                    : (isLight ? 'rgba(255,255,255,0.5)' : Colors.primaryBg),
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: isSelected
                    ? (isLight ? '#4e00cd' : Colors.accent)
                    : (isLight ? 'rgba(203,195,218,0.15)' : Colors.grey),
                }}>
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: isSelected
                        ? (isLight ? '#4e00cd' : Colors.accent)
                        : (isLight ? '#2c024d' : Colors.text),
                    }}>
                    {lang.nativeLabel}
                  </Text>
                  {lang.code !== 'en' && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: isLight ? '#494457' : Colors.textLight,
                        marginTop: 2,
                      }}>
                      {t(lang.labelKey)}
                    </Text>
                  )}
                </View>
                {isSelected && (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: isLight ? '#4e00cd' : Colors.accent,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Text style={{color: '#fff', fontSize: 14, fontWeight: '700'}}>
                      ✓
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}
