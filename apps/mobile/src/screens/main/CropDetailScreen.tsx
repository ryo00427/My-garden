// =============================================================================
// CropDetailScreen - 作物詳細画面
// =============================================================================
// デザインファイル: design/stitch_ (3)/screen.png
// 作物の詳細情報、成長曲線、作業履歴を表示します。

import React, { useState, type ComponentProps } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { cropsApi, tasksApi } from '../../services/api';
import { showAlert } from '../../utils/alert';

// 画面幅
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// タブの種類
type TabType = 'overview' | 'log' | 'photos';

// ナビゲーションの型定義
type RootStackParamList = {
  CropDetail: { cropId: number };
  EditCrop: { cropId: number };
  WorkLog: { cropId: number };
  RecordHarvest: { cropId: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'CropDetail'>;

// デフォルトの作物画像
const DEFAULT_CROP_IMAGES: Record<string, string> = {
  'ミニトマト': 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=600',
  'トマト': 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=600',
  'バジル': 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=600',
  'キュウリ': 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=600',
  'ナス': 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=600',
  'ピーマン': 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600',
};

// アイコンの型
type IconName = ComponentProps<typeof Ionicons>['name'];

export default function CropDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { cropId } = route.params;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const queryClient = useQueryClient();

  // 作物詳細を取得
  const { data: cropData, isLoading, refetch } = useQuery({
    queryKey: ['crop', cropId],
    queryFn: () => cropsApi.getById(cropId),
  });

  // APIはオブジェクトを直接返すので、cropData自体がCrop
  const crop = cropData;

  // この作物に紐づくタスクを取得（マイプラントとタスクの関係を可視化する）
  const { data: allTasks } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => tasksApi.getAll(),
  });
  const cropTasks = (allTasks || []).filter((t) => t.crop_id === cropId);

  // 作物削除
  const deleteCropMutation = useMutation({
    mutationFn: () => cropsApi.delete(cropId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      // 作物削除に伴いバックエンド側で紐づくタスクも削除されるため、タスク一覧も再取得する
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigation.goBack();
    },
    onError: (error: Error) => {
      showAlert('エラー', error.message || '作物の削除に失敗しました');
    },
  });

  // 戻る
  const handleBack = () => {
    navigation.goBack();
  };

  // 編集
  const handleEdit = () => {
    navigation.navigate('EditCrop', { cropId });
  };

  // 削除（確認ダイアログを表示してから削除）
  const handleDelete = () => {
    showAlert(
      '作物を削除',
      `「${crop?.name}」を削除しますか？この操作は取り消せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => deleteCropMutation.mutate(),
        },
      ]
    );
  };

  // 成長記録追加
  const handleAddLog = () => {
    navigation.navigate('WorkLog', { cropId });
  };

  // 収穫を記録（記録するとバックエンド側で作物のステータスが自動的に harvested に更新される）
  const handleRecordHarvest = () => {
    navigation.navigate('RecordHarvest', { cropId });
  };

  // 経過日数と進捗を計算
  const calculateProgress = () => {
    if (!crop) return { daysSincePlanting: 0, progress: 0 };

    const planted = new Date(crop.planted_date);
    const harvest = new Date(crop.expected_harvest_date);
    const now = new Date();

    const daysSincePlanting = Math.floor(
      (now.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalDays = Math.floor(
      (harvest.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24)
    );
    const progress = totalDays > 0 ? (daysSincePlanting / totalDays) * 100 : 0;

    return { daysSincePlanting, progress };
  };

  const { daysSincePlanting, progress: _progress } = calculateProgress();

  // 画像URLを取得
  const getImageUrl = () => {
    if (!crop) return 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600';
    return DEFAULT_CROP_IMAGES[crop.name] || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600';
  };

  if (isLoading || !crop) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">読み込み中...</Text>
      </SafeAreaView>
    );
  }

  // タブコンテンツ
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View>
            {/* 詳細情報グリッド */}
            <View className="mx-4 mt-4 rounded-xl bg-white p-4">
              <View className="flex-row">
                <View className="flex-1 border-r border-gray-100 pr-4">
                  <Text className="text-xs text-gray-500">品種</Text>
                  <Text className="mt-1 font-medium text-gray-800">{crop.variety || crop.name}</Text>
                </View>
                <View className="flex-1 pl-4">
                  <Text className="text-xs text-gray-500">植え付け日</Text>
                  <Text className="mt-1 font-medium text-gray-800">
                    {new Date(crop.planted_date).toLocaleDateString('ja-JP')}
                  </Text>
                </View>
              </View>
              <View className="mt-4 flex-row border-t border-gray-100 pt-4">
                <View className="flex-1 border-r border-gray-100 pr-4">
                  <Text className="text-xs text-gray-500">高さ</Text>
                  <Text className="mt-1 font-medium text-gray-800">30cm</Text>
                </View>
                <View className="flex-1 pl-4">
                  <Text className="text-xs text-gray-500">植え付けからの日数</Text>
                  <Text className="mt-1 font-medium text-gray-800">{daysSincePlanting}日</Text>
                </View>
              </View>
            </View>

            {/* この作物のタスク */}
            <View className="mx-4 mt-4 rounded-xl bg-white p-4">
              <Text className="font-semibold text-gray-800">この作物のタスク</Text>
              {cropTasks.length > 0 ? (
                <View className="mt-3">
                  {cropTasks.map((task) => {
                    const icon: IconName =
                      task.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline';
                    const iconColor = task.status === 'completed' ? '#22c55e' : '#9ca3af';
                    return (
                      <View key={task.id} className="flex-row items-center py-3">
                        <Ionicons name={icon} size={20} color={iconColor} />
                        <View className="ml-3 flex-1">
                          <Text
                            className={`font-medium ${
                              task.status === 'completed'
                                ? 'text-gray-400 line-through'
                                : 'text-gray-800'
                            }`}
                          >
                            {task.title}
                          </Text>
                        </View>
                        <Text className="text-sm text-gray-400">
                          {new Date(task.due_date).toLocaleDateString('ja-JP')}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text className="mt-3 text-sm text-gray-500">
                  この作物に紐づくタスクはまだありません
                </Text>
              )}
            </View>
          </View>
        );

      case 'log':
        return (
          <View className="items-center justify-center py-16">
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text className="mt-4 text-gray-500">成長記録はまだありません</Text>
            <TouchableOpacity
              onPress={handleAddLog}
              className="mt-4 rounded-full bg-emerald-600 px-6 py-2"
            >
              <Text className="font-medium text-white">成長記録を追加する</Text>
            </TouchableOpacity>
          </View>
        );

      case 'photos':
        return (
          <View className="items-center justify-center py-16">
            <Ionicons name="images-outline" size={64} color="#d1d5db" />
            <Text className="mt-4 text-gray-500">写真はまだありません</Text>
            <TouchableOpacity className="mt-4 rounded-full bg-emerald-600 px-6 py-2">
              <Text className="font-medium text-white">写真を追加する</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー画像 */}
        <View className="relative">
          <Image
            source={{ uri: getImageUrl() }}
            style={{ width: SCREEN_WIDTH, height: 280 }}
            resizeMode="cover"
          />
          {/* グラデーションオーバーレイ */}
          <View className="absolute inset-0 bg-black/30" />

          {/* ナビゲーションボタン */}
          <View className="absolute left-0 right-0 top-0 flex-row items-center justify-between p-4">
            <TouchableOpacity
              onPress={handleBack}
              className="rounded-full bg-white/20 p-2"
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <View className="flex-row">
              {crop.status !== 'harvested' && crop.status !== 'failed' && (
                <TouchableOpacity
                  onPress={handleRecordHarvest}
                  className="mr-2 rounded-full bg-emerald-500 px-4 py-2"
                >
                  <Text className="font-medium text-white">収穫を記録</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleEdit}
                className="mr-2 rounded-full bg-white/20 px-4 py-2"
              >
                <Text className="font-medium text-white">編集</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleteCropMutation.isPending}
                className="rounded-full bg-white/20 p-2"
              >
                <Ionicons name="trash-outline" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 作物名 */}
          <View className="absolute bottom-4 left-4">
            <Text className="text-2xl font-bold text-white">{crop.name}</Text>
          </View>
        </View>

        {/* タブ */}
        <View className="flex-row border-b border-gray-200 bg-white">
          {[
            { key: 'overview' as TabType, label: '概要' },
            { key: 'log' as TabType, label: 'ログ' },
            { key: 'photos' as TabType, label: '写真' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 items-center py-3 ${
                activeTab === tab.key ? 'border-b-2 border-emerald-600' : ''
              }`}
            >
              <Text
                className={`font-medium ${
                  activeTab === tab.key ? 'text-emerald-600' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* タブコンテンツ */}
        <View className="pb-24">{renderTabContent()}</View>
      </ScrollView>

      {/* FAB（成長記録追加ボタン） */}
      <TouchableOpacity
        onPress={handleAddLog}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-emerald-600 shadow-lg"
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
