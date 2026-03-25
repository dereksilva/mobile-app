/**
 * MnemonicImportScreen — import account from existing seed phrase.
 * Step 1: Enter mnemonic
 * Step 2: Enter name
 * Mirrors account_modals.dart import flow.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Svg, {
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import {checkMnemonicValid} from '../reef-chain/accountApi';
import {useAccounts} from '../hooks/useAccounts';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

interface MnemonicImportScreenProps {
  onDone: () => void;
  onCancel: () => void;
}

export default function MnemonicImportScreen({
  onDone,
  onCancel,
}: MnemonicImportScreenProps) {
  const {t} = useTranslation();
  const {importFromMnemonic} = useAccounts();
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  const [step, setStep] = useState<1 | 2>(1);
  const [mnemonic, setMnemonic] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mnemonicTrimmed = mnemonic.trim();
  const wordCount = mnemonicTrimmed
    ? mnemonicTrimmed.split(/\s+/).length
    : 0;
  const isValidWordCount = wordCount === 12 || wordCount === 24;
  const isValidMnemonic = isValidWordCount && checkMnemonicValid(mnemonicTrimmed);

  const handleNext = () => {
    setError(null);
    if (!isValidMnemonic) {
      setError(t('invalid_mnemonic_seed'));
      return;
    }
    setStep(2);
  };

  const handleImport = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);

    try {
      await importFromMnemonic(mnemonicTrimmed, name.trim(), '');
      onDone();
    } catch (err: any) {
      if (err.message.includes('already added')) {
        setError(t('account_already_added'));
      } else {
        setError(err.message);
      }
      setIsSaving(false);
    }
  };

  // ─── Light Mode ───────────────────────────────────────────────────────────
  if (isLight) {
    // Step 1: Mnemonic entry
    if (step === 1) {
      return (
        <ScrollView
          style={{flex: 1, backgroundColor: '#fff7fe'}}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 80,
          }}
          keyboardShouldPersistTaps="handled">

          {/* ── Header: Back arrow ── */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            marginBottom: 40,
          }}>
            <TouchableOpacity
              onPress={onCancel}
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  stroke="#2c024d"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* ── Hero Section ── */}
          <View style={{gap: 16, marginBottom: 40}}>
            <Text style={{
              fontSize: 36,
              fontWeight: '800',
              color: '#2c024d',
              letterSpacing: -0.9,
              lineHeight: 44,
            }}>
              Import the{' '}
              <Text style={{color: '#4e00cd'}}>account</Text>
            </Text>
            <Text style={{
              fontSize: 14,
              fontWeight: '500',
              color: '#494457',
              lineHeight: 22,
              opacity: 0.8,
            }}>
              Enter your 12-word recovery phrase exactly as it was given to you.
            </Text>
          </View>

          {/* ── Recovery Phrase Glass Card ── */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: 32,
            borderWidth: 1,
            borderColor: 'rgba(203, 195, 218, 0.15)',
            padding: 25,
            gap: 12,
            marginBottom: 32,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 4},
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}>
            {/* Label */}
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#4e00cd',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}>
              Recovery Phrase
            </Text>

            {/* Mnemonic input */}
            <TextInput
              value={mnemonic}
              onChangeText={text => {
                setMnemonic(text);
                setError(null);
              }}
              multiline
              numberOfLines={5}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="word1 word2 word3..."
              placeholderTextColor="#cbc3da"
              style={{
                fontSize: 15,
                color: '#2c024d',
                minHeight: 120,
                textAlignVertical: 'top',
                paddingVertical: 0,
                lineHeight: 24,
              }}
            />

            {/* Word count / validation */}
            {wordCount > 0 && (
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                {isValidWordCount && (
                  <View style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#00b46e',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{color: '#fff', fontSize: 10, fontWeight: '800'}}>✓</Text>
                  </View>
                )}
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: isValidWordCount ? '#00b46e' : '#494457',
                }}>
                  {wordCount} word{wordCount !== 1 ? 's' : ''} entered
                  {!isValidWordCount ? ' (need 12 or 24)' : ''}
                </Text>
              </View>
            )}
          </View>

          {/* ── Error ── */}
          {error && (
            <View style={{
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 24,
              borderLeftWidth: 4,
              borderLeftColor: Colors.error,
            }}>
              <Text style={{color: Colors.error, fontSize: 13, fontWeight: '500'}}>
                {error}
              </Text>
            </View>
          )}

          {/* ── Security Check ── */}
          <View style={{
            flexDirection: 'row',
            gap: 16,
            marginBottom: 40,
            paddingLeft: 4,
          }}>
            {/* Accent bar */}
            <View style={{
              width: 4,
              borderRadius: 2,
              backgroundColor: '#4e00cd',
            }} />
            {/* Content */}
            <View style={{flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start'}}>
              {/* Info icon */}
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: '#4e00cd',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 2,
              }}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                    stroke="#4e00cd"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <View style={{flex: 1, gap: 4}}>
                <Text style={{fontSize: 16, fontWeight: '800', color: '#2c024d'}}>
                  Security Check
                </Text>
                <Text style={{fontSize: 13, color: '#494457', lineHeight: 19, opacity: 0.8}}>
                  Make sure nobody is watching your screen while you enter these words.
                </Text>
              </View>
            </View>
          </View>

          {/* ── Next Step CTA ── */}
          <TouchableOpacity
            onPress={handleNext}
            disabled={!isValidWordCount}
            activeOpacity={0.8}
            style={{
              height: 64,
              borderRadius: 9999,
              overflow: 'hidden',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
              opacity: isValidWordCount ? 1 : 0.5,
              shadowColor: '#b70054',
              shadowOffset: {width: 0, height: 20},
              shadowOpacity: isValidWordCount ? 0.3 : 0,
              shadowRadius: 40,
              elevation: isValidWordCount ? 12 : 0,
              marginBottom: 24,
            }}>
            {/* Gradient background */}
            <Svg
              style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
              viewBox="0 0 1 1"
              preserveAspectRatio="none">
              <Defs>
                <SvgLinearGradient id="nextStepGrad" x1="0" y1="0" x2="0.3" y2="1">
                  <Stop offset="0" stopColor="#b70054" />
                  <Stop offset="1" stopColor="#4e00cd" />
                </SvgLinearGradient>
              </Defs>
              <Rect x="0" y="0" width="1" height="1" fill="url(#nextStepGrad)" />
            </Svg>
            <Text style={{fontSize: 18, fontWeight: '800', color: '#fff', zIndex: 1}}>
              Next Step
            </Text>
            {/* Arrow icon */}
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{zIndex: 1}}>
              <Path
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                stroke="#fff"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>

          {/* ── Help Link ── */}
          <TouchableOpacity activeOpacity={0.7} style={{alignSelf: 'center'}}>
            <Text style={{fontSize: 14, fontWeight: '600', color: '#b70054'}}>
              Lost your phrase? Help Center
            </Text>
          </TouchableOpacity>

          <View style={{height: 40}} />
        </ScrollView>
      );
    }

    // Step 2: Name entry (light mode)
    return (
      <ScrollView
        style={{flex: 1, backgroundColor: '#fff7fe'}}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 80,
        }}
        keyboardShouldPersistTaps="handled">

        {/* ── Header: Back arrow ── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          marginBottom: 40,
        }}>
          <TouchableOpacity
            onPress={() => setStep(1)}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                stroke="#2c024d"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* ── Hero ── */}
        <View style={{gap: 16, marginBottom: 40}}>
          <Text style={{
            fontSize: 36,
            fontWeight: '800',
            color: '#2c024d',
            letterSpacing: -0.9,
            lineHeight: 44,
          }}>
            Name your{' '}
            <Text style={{color: '#4e00cd'}}>account</Text>
          </Text>
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: '#494457',
            lineHeight: 22,
            opacity: 0.8,
          }}>
            Choose a descriptive name so you can easily identify this account later.
          </Text>
        </View>

        {/* ── Name Input Glass Card ── */}
        <View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          borderRadius: 32,
          borderWidth: 1,
          borderColor: 'rgba(203, 195, 218, 0.15)',
          padding: 25,
          gap: 12,
          marginBottom: 32,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 2,
        }}>
          <Text style={{
            fontSize: 12,
            fontWeight: '700',
            color: '#4e00cd',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}>
            Account Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            placeholder={t('name_your_account')}
            placeholderTextColor="#cbc3da"
            style={{
              fontSize: 16,
              color: '#2c024d',
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(203, 195, 218, 0.2)',
            }}
          />
        </View>

        {/* ── Error ── */}
        {error && (
          <View style={{
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            borderLeftWidth: 4,
            borderLeftColor: Colors.error,
          }}>
            <Text style={{color: Colors.error, fontSize: 13, fontWeight: '500'}}>
              {error}
            </Text>
          </View>
        )}

        {/* ── Import CTA ── */}
        <TouchableOpacity
          onPress={handleImport}
          disabled={!name.trim() || isSaving}
          activeOpacity={0.8}
          style={{
            height: 64,
            borderRadius: 9999,
            overflow: 'hidden',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
            opacity: name.trim() && !isSaving ? 1 : 0.5,
            shadowColor: '#b70054',
            shadowOffset: {width: 0, height: 20},
            shadowOpacity: name.trim() && !isSaving ? 0.3 : 0,
            shadowRadius: 40,
            elevation: name.trim() && !isSaving ? 12 : 0,
          }}>
          <Svg
            style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
            viewBox="0 0 1 1"
            preserveAspectRatio="none">
            <Defs>
              <SvgLinearGradient id="importGrad" x1="0" y1="0" x2="0.3" y2="1">
                <Stop offset="0" stopColor="#b70054" />
                <Stop offset="1" stopColor="#4e00cd" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width="1" height="1" fill="url(#importGrad)" />
          </Svg>
          <Text style={{fontSize: 18, fontWeight: '800', color: '#fff', zIndex: 1}}>
            {isSaving ? t('loading') : t('import_the_account')}
          </Text>
          {!isSaving && (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{zIndex: 1}}>
              <Path
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                stroke="#fff"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </TouchableOpacity>

        <View style={{height: 40}} />
      </ScrollView>
    );
  }

  // ─── Dark Mode (existing design) ────────────────────────────────────────────

  if (step === 1) {
    return (
      <ScrollView
        style={{flex: 1, backgroundColor: Colors.primaryBg}}
        contentContainerStyle={{padding: 24}}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}>
          <Text style={{fontSize: 20, fontWeight: '700', color: Colors.text}}>
            {t('import_the_account')}
          </Text>
          <TouchableOpacity onPress={onCancel}>
            <Text style={{color: Colors.textLight, fontSize: 16}}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Label */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors.textLight,
            letterSpacing: 0.5,
            marginBottom: 8,
          }}>
          {t('existing_seed')}
        </Text>

        {/* Mnemonic input */}
        <TextInput
          value={mnemonic}
          onChangeText={text => {
            setMnemonic(text);
            setError(null);
          }}
          multiline
          numberOfLines={4}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="word1 word2 word3 ..."
          placeholderTextColor={Colors.textLight}
          style={{
            width: '100%',
            backgroundColor: Colors.cardBg,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: Colors.text,
            borderWidth: 1,
            borderColor: error ? Colors.error : Colors.grey,
            marginBottom: 8,
            minHeight: 100,
            textAlignVertical: 'top',
          }}
        />

        {/* Word count indicator */}
        <Text
          style={{
            fontSize: 12,
            color: isValidWordCount ? Colors.green : Colors.textLight,
            marginBottom: 8,
          }}>
          {wordCount} word{wordCount !== 1 ? 's' : ''} entered
          {isValidWordCount ? ' ✓' : ' (need 12 or 24)'}
        </Text>

        {/* Error */}
        {error && (
          <Text
            style={{
              color: Colors.error,
              fontSize: 13,
              marginBottom: 8,
              fontWeight: '500',
            }}>
            {error}
          </Text>
        )}

        {/* Next button */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={!isValidWordCount}
          activeOpacity={0.7}
          style={{
            marginTop: 16,
            backgroundColor: isValidWordCount ? Colors.purple : Colors.grey,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}>
          <Text
            style={{
              color: isValidWordCount ? '#fff' : Colors.textLight,
              fontSize: 16,
              fontWeight: '600',
            }}>
            {t('next_step')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Step 2: Name entry (dark mode)
  return (
    <ScrollView
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
      contentContainerStyle={{padding: 24}}
      keyboardShouldPersistTaps="handled">
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}>
        <TouchableOpacity onPress={() => setStep(1)}>
          <Text style={{color: Colors.purple, fontSize: 16}}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel}>
          <Text style={{color: Colors.textLight, fontSize: 16}}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: Colors.textLight,
          letterSpacing: 0.5,
          marginBottom: 8,
        }}>
        {t('descriptive_account_name')}
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder={t('name_your_account')}
        placeholderTextColor={Colors.textLight}
        style={{
          width: '100%',
          backgroundColor: Colors.cardBg,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          color: Colors.text,
          borderWidth: 1,
          borderColor: Colors.grey,
          marginBottom: 12,
        }}
      />

      {/* Error */}
      {error && (
        <Text
          style={{
            color: Colors.error,
            fontSize: 13,
            marginBottom: 8,
            fontWeight: '500',
          }}>
          {error}
        </Text>
      )}

      {/* Import */}
      <TouchableOpacity
        onPress={handleImport}
        disabled={!name.trim() || isSaving}
        activeOpacity={0.7}
        style={{
          marginTop: 16,
          backgroundColor:
            name.trim() && !isSaving ? Colors.purple : Colors.grey,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        }}>
        <Text
          style={{
            color: name.trim() && !isSaving ? '#fff' : Colors.textLight,
            fontSize: 16,
            fontWeight: '600',
          }}>
          {isSaving ? t('loading') : t('import_the_account')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
