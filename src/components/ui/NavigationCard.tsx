import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle, useWindowDimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../theme/colors';

export interface NavigationCardProps {
  title: string;
  color?: string;
  icon?: string; // e.g. emoji or glyph
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  titleSize?: number;
  iconName?: string;
  appearance?: 'solid' | 'surface';
}

export function NavigationCard({ title, color = Colors.primary, icon = '📄', onPress, style, iconSize, titleSize, iconName, appearance = 'solid' }: NavigationCardProps) {
  const [measuredHeight, setMeasuredHeight] = React.useState<number>(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const isSurface = appearance === 'surface';

  // Adjust icon size calculation for landscape mode
  const computedIconSize = iconSize || Math.max(
    32, // Minimum size
    Math.min(
      120, // Maximum size
      Math.floor((measuredHeight || 0) * (isLandscape ? 0.45 : 0.4)) || 72
    )
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.72}
      style={[
        styles.card,
        isSurface ? [styles.surfaceCard, { backgroundColor: Colors.surface, borderColor: Colors.border }] : { backgroundColor: color },
        style,
      ]}
      onLayout={(e) => setMeasuredHeight(e.nativeEvent.layout.height)}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {isSurface ? (
        <>
          <View style={[styles.iconBadge, { backgroundColor: `${color}1A` }]}>
            {iconName ? (
              <MaterialCommunityIcons name={iconName} size={iconSize || 28} color={color} />
            ) : (
              <Text style={{ fontSize: iconSize || 28 }}>{icon}</Text>
            )}
          </View>
          <View style={[styles.arrowButton, { backgroundColor: `${Colors.mutedText}12` }]}>
            <MaterialCommunityIcons name="arrow-right" size={22} color={Colors.mutedText} />
          </View>
          <Text
            numberOfLines={2}
            style={[styles.surfaceTitle, { color: Colors.heading, fontSize: titleSize || 16 }]}
          >
            {title}
          </Text>
        </>
      ) : (
        <>
          <Text style={[styles.icon, { color: '#FFFFFF', fontSize: computedIconSize }]}>{icon}</Text>
          <Text style={[styles.title, {
            color: '#FFFFFF',
            fontSize: titleSize || (isLandscape ? 24 : 22),
          }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2, // Add subtle elevation for Android
    shadowColor: '#000', // Add subtle shadow for iOS
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
  },
  surfaceCard: {
    borderWidth: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowOpacity: 0.07,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButton: {
    position: 'absolute',
    right: 13,
    top: 13,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surfaceTitle: {
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 11,
    paddingRight: 4,
  },
});
