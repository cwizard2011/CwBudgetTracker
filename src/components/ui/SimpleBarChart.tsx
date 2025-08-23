import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';

export interface ChartSeries {
  label: string;
  data: number[];
  color: string;
}

interface SimpleBarChartProps {
  categories: string[];
  series: ChartSeries[];
  height?: number;
  barWidth?: number; // width of each individual bar
  groupGap?: number; // gap between groups (categories)
  barGap?: number;   // gap between bars inside a group
  showYAxis?: boolean;
  yTicks?: number;
  yFormatter?: (n: number) => string;
  showLegend?: boolean;
  yStep?: number; // fixed step for Y axis ticks (e.g., 50_000)
  yMinTop?: number; // minimum top value to display (e.g., enforce 200_000)
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  categories,
  series,
  height = 160,
  barWidth = 16,
  groupGap = 18,
  barGap = 6,
  showYAxis = true,
  yTicks = 4,
  yFormatter,
  showLegend = true,
  yStep,
  yMinTop,
}) => {
  const max = Math.max(1, ...series.flatMap(s => s.data));
  const groupWidth = series.length * barWidth + (series.length - 1) * barGap;
  const yAxisWidth = showYAxis ? 36 : 0;
  const chartHeight = height - 44; // reserve space for labels
  let ticks: number[];
  let effectiveMax = max;
  if (yStep && yStep > 0) {
    const maxRounded = Math.ceil(max / yStep) * yStep;
    const top = Math.max(maxRounded, yMinTop || 0);
    effectiveMax = top;
    const len = Math.max(1, Math.round(top / yStep));
    ticks = Array.from({ length: len + 1 }, (_, i) => i * yStep);
  } else {
    const tickCount = Math.max(2, yTicks);
    ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((max * i) / tickCount));
    effectiveMax = max;
  }
  const tickDivisions = Math.max(1, (ticks.length - 1));
  const formatY = (n: number) => {
    if (yFormatter) return yFormatter(n);
    try {
      return new Intl.NumberFormat(undefined as any, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
    } catch {
      return String(n);
    }
  };

  const legendSpace = showLegend ? 32 : 0;
  return (
    <View style={[styles.container, { height: height + legendSpace, backgroundColor: Colors.surface, borderColor: Colors.border }] }>
      {/* Grid + Y Axis */}
      {showYAxis && (
        <View style={{ position: 'absolute', left: 8, top: 8, bottom: 24 + legendSpace, width: yAxisWidth - 12 }}>
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            {ticks.slice().reverse().map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: Colors.mutedText, fontSize: 10 }}>{formatY(t)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 + yAxisWidth, paddingVertical: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          {/* Horizontal grid lines */}
          <View style={{ position: 'absolute', left: -yAxisWidth + 12, right: 0, top: 0, height: chartHeight }}>
            {ticks.map((_, i) => (
              <View key={i} style={{ position: 'absolute', left: yAxisWidth - 12, right: 0, top: (chartHeight * (tickDivisions - i)) / tickDivisions, height: 1, backgroundColor: Colors.border }} />
            ))}
          </View>
          {categories.map((cat, idx) => (
            <View key={cat + idx} style={{ width: groupWidth, marginRight: groupGap }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight }}>
                {series.map((s, si) => {
                  const value = s.data[idx] || 0;
                  const h = Math.round(((value <= 0 ? 0 : value) / effectiveMax) * (chartHeight - 16));
                  return (
                    <View key={`${cat}-${si}`} style={{ width: barWidth, height: h, backgroundColor: s.color, marginRight: si < series.length - 1 ? barGap : 0, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                  );
                })}
              </View>
              <Text style={[styles.label]} numberOfLines={1}>{cat}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      {showLegend && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, paddingTop: 4 }}>
          {series.map(s => (
            <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginTop: 4 }}>
              <View style={{ width: 10, height: 10, backgroundColor: s.color, marginRight: 6, borderRadius: 2 }} />
              <Text style={{ color: Colors.mutedText, fontSize: 12 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 8 },
  label: { color: Colors.mutedText, fontSize: 10, textAlign: 'center', marginTop: 6 },
});


