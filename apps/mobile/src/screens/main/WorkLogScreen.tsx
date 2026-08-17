// =============================================================================
// WorkLogScreen - 成長記録画面
// =============================================================================
// デザインファイル: design/stitch_ (2)/screen.png
// 作物の成長記録を追加するフォームを提供します。
// 記録すると、バックエンド側で作物のステータスが自動的に
// planted -> growing に更新されます（design.md のライフサイクル図に対応）。

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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cropsApi, growthRecordsApi } from '../../services/api';

// 成長段階
type GrowthStage = 'seedling' | 'vegetative' | 'flowering' | 'fruiting';

// ナビゲーションの型定義
type RootStackParamList = {
  WorkLog: { cropId?: number };
};

type RouteType = RouteProp<RootStackParamList, 'WorkLog'>;

// 成長段階の定義（バックエンドの model.GrowthRecord.GrowthStage に対応）
const GROWTH_STAGES: { key: GrowthStage; label: string; icon: string }[] = [
  { key: 'seedling', label: '苗', icon: 'leaf-outline' },
  { key: 'vegetative', label: '成長期', icon: 'leaf' },
  { key: 'flowering', label: '開花期', icon: 'flower' },
  { key: 'fruiting', label: '結実期', icon: 'nutrition' },
];

export default function WorkLogScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const cropId = route.params?.cropId;
  const queryClient = useQueryClient();

  // フォーム状態
  const [dateStr, setDateStr] = useState(
    new Date().toISOString().split('T')[0] // YYYY-MM-DD形式
  );
  const [selectedCropId, setSelectedCropId] = useState<number | null>(cropId || null);
  const [growthStage, setGrowthStage] = useState<GrowthStage>('seedling');
  const [memo, setMemo] = useState('');
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [error, setError] = useState('');

  // 作物一覧を取得
  const { data: cropsData } = useQuery({
    queryKey: ['crops'],
    queryFn: () => cropsApi.getAll(),
  });

  // APIは配列を直接返すので、cropsData自体が配列
  const crops = cropsData || [];
  const selectedCrop = crops.find((c) => c.id === selectedCropId);

  // 成長記録の作成
  const createGrowthRecordMutation = useMutation({
    mutationFn: (data: { record_date: string; growth_stage: GrowthStage; notes?: string }) =>
      growthRecordsApi.create(selectedCropId as number, data),
    onSuccess: () => {
      // 作物のステータスが変わりうるため、関連するクエリを再取得
      queryClient.invalidateQueries({ queryKey: ['crop', selectedCropId] });
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      navigation.goBack();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // 保存
  const handleSave = () => {
    if (!selectedCropId) {
      setError('対象の植物を選択してください');
      return;
    }
    setError('');
    createGrowthRecordMutation.mutate({
      record_date: new Date(dateStr + 'T00:00:00Z').toISOString(),
      growth_stage: growthStage,
      notes: memo.trim() || undefined,
    });
  };

  // 閉じる
  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* ヘッダー */}
        <View className="flex-row items-center justify-between bg-gray-100 px-4 py-3">
          <TouchableOpacity onPress={handleClose} className="p-2">
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-600">成長記録</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={createGrowthRecordMutation.isPending}
            className={`rounded-lg px-4 py-2 ${
              createGrowthRecordMutation.isPending ? 'bg-emerald-300' : 'bg-emerald-500'
            }`}
          >
            <Text className="font-bold text-white">
              {createGrowthRecordMutation.isPending ? '保存中...' : '保存'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 日付と対象植物 */}
          <View className="mx-4 mt-4 overflow-hidden rounded-xl bg-gray-200">
            {/* 日付 */}
            <View className="flex-row items-center border-b border-gray-300 px-4 py-4">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-emerald-500">
                <Ionicons name="calendar" size={20} color="white" />
              </View>
              <Text className="flex-1 text-gray-600">日付</Text>
              <TextInput
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="2024-12-15"
                placeholderTextColor="#9ca3af"
                className="w-32 text-right text-gray-800"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            {/* 対象植物 */}
            <TouchableOpacity
              onPress={() => setShowCropPicker(!showCropPicker)}
              className="flex-row items-center px-4 py-4"
            >
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-emerald-500">
                <Ionicons name="leaf" size={20} color="white" />
              </View>
              <Text className="flex-1 text-gray-600">対象の植物</Text>
              <Text className="text-gray-800">
                {selectedCrop ? selectedCrop.name : '選択してください'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* 植物選択ドロップダウン */}
          {showCropPicker && (
            <View className="mx-4 mt-2 rounded-xl bg-white shadow-sm">
              {crops.length > 0 ? (
                crops.map((crop) => (
                  <TouchableOpacity
                    key={crop.id}
                    onPress={() => {
                      setSelectedCropId(crop.id);
                      setShowCropPicker(false);
                    }}
                    className="flex-row items-center border-b border-gray-100 px-4 py-3"
                  >
                    <Text
                      className={`flex-1 ${
                        selectedCropId === crop.id
                          ? 'font-medium text-emerald-600'
                          : 'text-gray-800'
                      }`}
                    >
                      {crop.name}
                    </Text>
                    {selectedCropId === crop.id && (
                      <Ionicons name="checkmark" size={20} color="#22c55e" />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View className="px-4 py-3">
                  <Text className="text-gray-500">作物がありません</Text>
                </View>
              )}
            </View>
          )}

          {/* 成長段階 */}
          <View className="px-4 py-4">
            <Text className="mb-3 font-medium text-gray-600">成長段階</Text>
            <View className="flex-row flex-wrap">
              {GROWTH_STAGES.map((stage) => (
                <TouchableOpacity
                  key={stage.key}
                  onPress={() => setGrowthStage(stage.key)}
                  className={`mb-2 mr-2 rounded-lg px-4 py-2 ${
                    growthStage === stage.key ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      growthStage === stage.key ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {stage.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* メモ */}
          <View className="px-4 py-2">
            <Text className="mb-3 font-medium text-gray-600">メモ</Text>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder="作業の詳細や気づいたこと..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="h-28 rounded-xl bg-white px-4 py-3 text-base text-gray-800"
            />
          </View>

          {error !== '' && (
            <View className="mx-4 mb-4 rounded-lg bg-red-50 p-3">
              <Text className="text-center text-red-600">{error}</Text>
            </View>
          )}

          {/* 余白 */}
          <View className="h-24" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
