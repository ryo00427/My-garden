// =============================================================================
// RecordHarvestScreen - 収穫記録画面
// =============================================================================
// 作物の収穫を記録するフォームを提供します。
// 記録すると、バックエンド側で作物のステータスが自動的に「収穫済み」に更新されます。

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { harvestsApi } from '../../services/api';

// 単位の種類
type QuantityUnit = 'kg' | 'g' | 'pieces';

// 品質評価の種類
type Quality = 'excellent' | 'good' | 'fair' | 'poor';

// ナビゲーションの型定義
type RootStackParamList = {
  RecordHarvest: { cropId: number };
};

type RouteType = RouteProp<RootStackParamList, 'RecordHarvest'>;

const UNIT_OPTIONS: { key: QuantityUnit; label: string }[] = [
  { key: 'kg', label: 'kg' },
  { key: 'g', label: 'g' },
  { key: 'pieces', label: '個' },
];

const QUALITY_OPTIONS: { key: Quality; label: string }[] = [
  { key: 'excellent', label: '優良' },
  { key: 'good', label: '良好' },
  { key: 'fair', label: '普通' },
  { key: 'poor', label: '不良' },
];

export default function RecordHarvestScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { cropId } = route.params;
  const queryClient = useQueryClient();

  const [harvestDateStr, setHarvestDateStr] = useState(
    new Date().toISOString().split('T')[0] ?? ''
  );
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<QuantityUnit>('kg');
  const [quality, setQuality] = useState<Quality | null>(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createHarvestMutation = useMutation({
    mutationFn: (data: {
      harvest_date: string;
      quantity: number;
      quantity_unit: QuantityUnit;
      quality?: Quality;
      notes?: string;
    }) => harvestsApi.create(cropId, data),
    onSuccess: () => {
      // 作物のステータスが harvested に変わるため、関連するクエリを再取得
      queryClient.invalidateQueries({ queryKey: ['crop', cropId] });
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      navigation.goBack();
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message });
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!harvestDateStr.trim() || !dateRegex.test(harvestDateStr)) {
      newErrors.date = '収穫日をYYYY-MM-DD形式で入力してください';
    }

    const quantityNum = Number(quantity);
    if (!quantity.trim() || Number.isNaN(quantityNum) || quantityNum <= 0) {
      newErrors.quantity = '収穫量を正しく入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    createHarvestMutation.mutate({
      harvest_date: new Date(harvestDateStr + 'T00:00:00Z').toISOString(),
      quantity: Number(quantity),
      quantity_unit: unit,
      quality: quality ?? undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* ヘッダー */}
        <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
          <TouchableOpacity onPress={handleClose} className="p-2">
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800">収穫を記録</Text>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-4 py-6">
            {/* 収穫日 */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-gray-700">
                収穫日 <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={harvestDateStr}
                onChangeText={setHarvestDateStr}
                placeholder="2024-01-01"
                placeholderTextColor="#9ca3af"
                className={`rounded-lg border bg-white px-4 py-3 text-base text-gray-800 ${
                  errors.date ? 'border-red-500' : 'border-gray-200'
                }`}
                keyboardType="numbers-and-punctuation"
              />
              {errors.date && <Text className="mt-1 text-sm text-red-500">{errors.date}</Text>}
            </View>

            {/* 収穫量 */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-gray-700">
                収穫量 <Text className="text-red-500">*</Text>
              </Text>
              <View className="flex-row items-center">
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="例：2.5"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  className={`mr-2 flex-1 rounded-lg border bg-white px-4 py-3 text-base text-gray-800 ${
                    errors.quantity ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                <View className="flex-row">
                  {UNIT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => setUnit(opt.key)}
                      className={`ml-2 rounded-lg px-3 py-3 ${
                        unit === opt.key ? 'bg-emerald-500' : 'bg-gray-100'
                      }`}
                    >
                      <Text
                        className={`font-medium ${
                          unit === opt.key ? 'text-white' : 'text-gray-500'
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {errors.quantity && (
                <Text className="mt-1 text-sm text-red-500">{errors.quantity}</Text>
              )}
            </View>

            {/* 品質評価 */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-gray-700">品質評価（オプション）</Text>
              <View className="flex-row flex-wrap">
                {QUALITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setQuality(quality === opt.key ? null : opt.key)}
                    className={`mb-2 mr-2 rounded-lg px-4 py-2 ${
                      quality === opt.key ? 'bg-emerald-500' : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`font-medium ${
                        quality === opt.key ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* メモ */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-gray-700">メモ（オプション）</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="味や出来栄えなど"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="h-28 rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-800"
              />
            </View>

            {errors.submit && (
              <View className="mb-4 rounded-lg bg-red-50 p-3">
                <Text className="text-center text-red-600">{errors.submit}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* 保存ボタン */}
        <View className="border-t border-gray-100 px-4 py-4">
          <TouchableOpacity
            onPress={handleSave}
            disabled={createHarvestMutation.isPending}
            className={`items-center rounded-full py-4 ${
              createHarvestMutation.isPending ? 'bg-emerald-300' : 'bg-emerald-500'
            }`}
          >
            <Text className="text-lg font-bold text-white">
              {createHarvestMutation.isPending ? '保存中...' : '収穫を記録する'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
