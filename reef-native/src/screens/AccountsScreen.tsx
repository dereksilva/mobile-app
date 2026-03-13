import React from 'react';
import {View, Text} from 'react-native';
import {useTranslation} from 'react-i18next';

export default function AccountsScreen() {
  const {t} = useTranslation();

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={{fontSize: 18, fontWeight: '600'}}>{t('accounts')}</Text>
    </View>
  );
}
