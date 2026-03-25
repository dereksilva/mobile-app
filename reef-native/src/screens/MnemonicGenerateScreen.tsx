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

  if (step === 1) {
    return (
      <ScrollView
        style={{flex: 1, backgroundColor: Colors.primaryBg}}
        contentContainerStyle={{padding: 24}}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}>
          <Text style={{fontSize: 20, fontWeight: '700', color: Colors.text}}>
            {t('create_new_account')}
          </Text>
          <TouchableOpacity onPress={onCancel}>
            <Text style={{color: Colors.textLight, fontSize: 16}}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Mnemonic label */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors.textLight,
            letterSpacing: 0.5,
            marginBottom: 12,
          }}>
          {t('generated_2_word')}
        </Text>

        {/* Word grid */}
        <View
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: Colors.grey,
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
                  backgroundColor: Colors.primaryBg,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}>
                <Text style={{color: Colors.text, fontSize: 14}}>
                  <Text style={{color: Colors.textLight}}>{i + 1}. </Text>
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
            backgroundColor: Colors.purpleDark,
            borderRadius: 8,
            marginBottom: 20,
          }}>
          <Text style={{color: '#fff', fontSize: 13, fontWeight: '600'}}>
            {t('copy_to_clipboard')}
          </Text>
        </TouchableOpacity>

        {/* Warning */}
        <Text
          style={{
            fontSize: 13,
            color: Colors.textLight,
            lineHeight: 20,
            marginBottom: 20,
          }}>
          {t('please_write_down')}
        </Text>

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
              borderColor: confirmed ? Colors.purple : Colors.grey,
              backgroundColor: confirmed ? Colors.purple : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
              marginTop: 1,
            }}>
            {confirmed && (
              <Text style={{color: '#fff', fontSize: 14, fontWeight: '700'}}>
                ✓
              </Text>
            )}
          </View>
          <Text style={{flex: 1, fontSize: 13, color: Colors.text, lineHeight: 20}}>
            {t('i_saved_mnemonic')}
          </Text>
        </TouchableOpacity>

        {/* Next button */}
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
      </ScrollView>
    );
  }

  // Step 2: Name entry
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
          marginBottom: 24,
        }}
      />

      {/* Address preview */}
      <Text
        style={{
          fontSize: 12,
          color: Colors.textLight,
          marginBottom: 4,
        }}>
        Address
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontFamily: 'monospace',
          color: Colors.text,
          backgroundColor: Colors.cardBg,
          borderRadius: 8,
          padding: 12,
          marginBottom: 32,
          borderWidth: 1,
          borderColor: Colors.grey,
        }}>
        {address}
      </Text>

      {/* Create */}
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
    </ScrollView>
  );
}
