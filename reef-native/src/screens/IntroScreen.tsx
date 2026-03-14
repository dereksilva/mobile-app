/**
 * IntroScreen — first-launch onboarding carousel.
 * Mirrors introduction_page.dart.
 */

import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Colors} from '../utils/colors';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const introGif = require('../assets/images/intro.gif');

const {width} = Dimensions.get('window');

interface IntroScreenProps {
  onDone: () => void;
}

const SLIDES = [
  {
    titleKey: 'reliable',
    color: Colors.purple,
  },
  {
    titleKey: 'extensible',
    color: Colors.purpleDark,
  },
  {
    titleKey: 'efficient',
    color: Colors.accentSecondaryDark,
  },
  {
    titleKey: 'fast',
    color: Colors.green,
  },
];

export default function IntroScreen({onDone}: IntroScreenProps) {
  const {t} = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLast = currentSlide === SLIDES.length - 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentSlide(index);
  };

  const handleNext = () => {
    if (isLast) {
      onDone();
    } else {
      scrollRef.current?.scrollTo({
        x: (currentSlide + 1) * width,
        animated: true,
      });
    }
  };

  return (
    <View style={{flex: 1, backgroundColor: Colors.splashBg}}>
      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={{flex: 1}}>
        {SLIDES.map((slide, index) => (
          <View
            key={index}
            style={{
              width,
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 40,
            }}>
            {/* Intro animation on first slide, colored circle on others */}
            {index === 0 ? (
              <Image
                source={introGif}
                style={{
                  width: 200,
                  height: 200,
                  marginBottom: 48,
                }}
                resizeMode="contain"
              />
            ) : (
              <View
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  backgroundColor: slide.color,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 48,
                  opacity: 0.9,
                }}>
                <Text
                  style={{color: '#fff', fontSize: 56, fontWeight: '700'}}>
                  R
                </Text>
              </View>
            )}

            <Text
              style={{
                fontSize: 32,
                fontWeight: '800',
                color: slide.color,
                marginBottom: 12,
              }}>
              {t(slide.titleKey)}
            </Text>

            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: Colors.text,
                marginBottom: 16,
                textAlign: 'center',
              }}>
              {t('blockchain_for_defi')}
            </Text>

            {index === 0 && (
              <Text
                style={{
                  fontSize: 14,
                  color: Colors.textLight,
                  textAlign: 'center',
                  lineHeight: 22,
                  paddingHorizontal: 12,
                }}>
                {t('reef_chain_desc')}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View
        style={{
          paddingHorizontal: 32,
          paddingBottom: 48,
          alignItems: 'center',
        }}>
        {/* Dots */}
        <View
          style={{
            flexDirection: 'row',
            marginBottom: 24,
            gap: 8,
          }}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={{
                width: currentSlide === index ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  currentSlide === index ? Colors.purple : Colors.grey,
              }}
            />
          ))}
        </View>

        {/* Next / Done button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.7}
          style={{
            width: '100%',
            backgroundColor: Colors.purple,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
          }}>
          <Text style={{color: '#fff', fontSize: 16, fontWeight: '700'}}>
            {isLast ? t('done') : t('next')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
