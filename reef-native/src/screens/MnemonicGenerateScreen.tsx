/**
 * MnemonicGenerateScreen — create new account flow.
 * Step 1: Show generated mnemonic
 * Step 2: Enter name + confirm mnemonic saved
 * Mirrors account_modals.dart creation flow.
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import {useAccounts} from '../hooks/useAccounts';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';
import Svg, {Rect, Defs, LinearGradient as SvgLinearGradient, Stop} from 'react-native-svg';

interface MnemonicGenerateScreenProps {
  onDone: () => void;
  onCancel: () => void;
}

export default function MnemonicGenerateScreen({
  onDone,
  onCancel,
}: MnemonicGenerateScreenProps) {
  const {t} = useTranslation();
  const {generateNewAccount, createAccount} = useAccounts();
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  const [step, setStep] = useState<1 | 2>(1);
  const [mnemonic, setMnemonic] = useState('');
  const [address, setAddress] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    generateNewAccount().then(result => {
      setMnemonic(result.mnemonic);
      setAddress(result.address);
    });
  }, [generateNewAccount]);

  const handleCopy = () => {
    Clipboard.setString(mnemonic);
    Alert.alert(t('copy_to_clipboard'), t('generated_2_word'));
  };

  const handleNext = () => {
    if (step === 1 && confirmed) {
      setStep(2);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsSaving(true);

    try {
      await createAccount(name.trim(), '');
      onDone();
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setIsSaving(false);
    }
  };

  const words = mnemonic.split(' ');

  /* ── Light-mode gradient CTA helper ── */
  const GradientButton = ({onPress, disabled, label}: {onPress: () => void; disabled?: boolean; label: string}) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={{
        height: 64,
        borderRadius: 9999,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: disabled ? 0.45 : 1,
      }}>
      <Svg
        style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
        viewBox="0 0 1 1"
        preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="mnemonicCtaGrad" x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor="#b70054" />
            <Stop offset="1" stopColor="#4e00cd" />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill="url(#mnemonicCtaGrad)" />
      </Svg>
      <Text style={{fontSize: 16, fontWeight: '700', color: '#fff', zIndex: 1}}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (step === 1) {
    return (
      <ScrollView
        style={{flex: 1, backgroundColor: isLight ? '#fff7fe' : Colors.primaryBg}}
        contentContainerStyle={{padding: 24}}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 24,
          }}>
          <TouchableOpacity onPress={onCancel} style={{marginRight: 12}}>
            <Text style={{color: isLight ? '#4e00cd' : Colors.textLight, fontSize: 22}}>
              {'\u2190'}
            </Text>
          </TouchableOpacity>
          <Text style={{fontSize: 20, fontWeight: '700', color: isLight ? '#2c024d' : Colors.text, flex: 1}}>
            {t('create_new_account')}
          </Text>
          <TouchableOpacity onPress={onCancel}>
            <Text style={{color: isLight ? '#494457' : Colors.textLight, fontSize: 16}}>
              {'\u2715'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mnemonic label */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: isLight ? '#494457' : Colors.textLight,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
          {t('generated_2_word')}
        </Text>

        {/* Word grid */}
        <View
          style={{
            backgroundColor: isLight ? 'rgba(255,255,255,0.4)' : Colors.cardBg,
            borderRadius: isLight ? 32 : 14,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isLight ? 'rgba(78,0,205,0.05)' : Colors.grey,
          }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
            }}>
            {words.map((word, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: isLight ? 'rgba(78,0,205,0.06)' : Colors.primaryBg,
                  borderRadius: isLight ? 9999 : 8,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}>
                <Text style={{color: isLight ? '#2c024d' : Colors.text, fontSize: 14}}>
                  <Text style={{color: isLight ? '#494457' : Colors.textLight}}>{i + 1}. </Text>
                  {word}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Copy button */}
        <TouchableOpacity
          onPress={handleCopy}
          activeOpacity={0.7}
          style={{
            alignSelf: 'flex-start',
            paddingVertical: 8,
            paddingHorizontal: 16,
            backgroundColor: isLight ? '#4e00cd' : Colors.purpleDark,
            borderRadius: isLight ? 9999 : 8,
            marginBottom: 20,
          }}>
          <Text style={{color: '#fff', fontSize: 13, fontWeight: '600'}}>
            {t('copy_to_clipboard')}
          </Text>
        </TouchableOpacity>

        {/* Warning */}
        <View
          style={{
            backgroundColor: isLight ? 'rgba(78,0,205,0.06)' : 'transparent',
            borderRadius: isLight ? 20 : 0,
            padding: isLight ? 16 : 0,
            marginBottom: 20,
          }}>
          <Text
            style={{
              fontSize: 13,
              color: isLight ? '#494457' : Colors.textLight,
              lineHeight: 20,
            }}>
            {t('please_write_down')}
          </Text>
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          onPress={() => setConfirmed(!confirmed)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 24,
          }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: confirmed ? (isLight ? '#4e00cd' : Colors.purple) : (isLight ? '#cbc3da' : Colors.grey),
              backgroundColor: confirmed ? (isLight ? '#4e00cd' : Colors.purple) : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
              marginTop: 1,
            }}>
            {confirmed && (
              <Text style={{color: '#fff', fontSize: 14, fontWeight: '700'}}>
                {'\u2713'}
              </Text>
            )}
          </View>
          <Text style={{flex: 1, fontSize: 13, color: isLight ? '#2c024d' : Colors.text, lineHeight: 20}}>
            {t('i_saved_mnemonic')}
          </Text>
        </TouchableOpacity>

        {/* Next button */}
        {isLight ? (
          <GradientButton onPress={handleNext} disabled={!confirmed} label={t('next_step')} />
        ) : (
          <TouchableOpacity
            onPress={handleNext}
            disabled={!confirmed}
            activeOpacity={0.7}
            style={{
              backgroundColor: confirmed ? Colors.purple : Colors.grey,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}>
            <Text
              style={{
                color: confirmed ? '#fff' : Colors.textLight,
                fontSize: 16,
                fontWeight: '600',
              }}>
              {t('next_step')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // Step 2: Name entry
  return (
    <ScrollView
      style={{flex: 1, backgroundColor: isLight ? '#fff7fe' : Colors.primaryBg}}
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
          <Text style={{color: isLight ? '#4e00cd' : Colors.purple, fontSize: 16}}>
            {'\u2190'} Back
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel}>
          <Text style={{color: isLight ? '#494457' : Colors.textLight, fontSize: 16}}>
            {'\u2715'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: isLight ? '#494457' : Colors.textLight,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
        {t('descriptive_account_name')}
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder={t('name_your_account')}
        placeholderTextColor={isLight ? '#cbc3da' : Colors.textLight}
        style={{
          width: '100%',
          backgroundColor: isLight ? '#fff' : Colors.cardBg,
          borderRadius: isLight ? 32 : 12,
          paddingHorizontal: isLight ? 24 : 16,
          paddingVertical: isLight ? undefined : 14,
          height: isLight ? 64 : undefined,
          fontSize: 16,
          color: isLight ? '#2c024d' : Colors.text,
          borderWidth: 1,
          borderColor: isLight ? 'rgba(78,0,205,0.05)' : Colors.grey,
          marginBottom: 24,
        }}
      />

      {/* Address preview */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: isLight ? '#494457' : Colors.textLight,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
        Address
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontFamily: 'monospace',
          color: isLight ? '#2c024d' : Colors.text,
          backgroundColor: isLight ? 'rgba(255,255,255,0.4)' : Colors.cardBg,
          borderRadius: isLight ? 20 : 8,
          padding: 12,
          marginBottom: 32,
          borderWidth: 1,
          borderColor: isLight ? 'rgba(78,0,205,0.05)' : Colors.grey,
        }}>
        {address}
      </Text>

      {/* Create */}
      {isLight ? (
        <GradientButton
          onPress={handleCreate}
          disabled={!name.trim() || isSaving}
          label={isSaving ? t('loading') : t('add_the_account')}
        />
      ) : (
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!name.trim() || isSaving}
          activeOpacity={0.7}
          style={{
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
            {isSaving ? t('loading') : t('add_the_account')}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
