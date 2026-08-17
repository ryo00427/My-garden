// =============================================================================
// HomeScreen - ホーム画面（マイガーデン）
// =============================================================================
// デザインファイル: design/stitch_/screen.png
// ダッシュボード表示：次の作業カード、栽培中の作物リスト

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tasksApi, cropsApi } from '../../services/api';
import { CropCard } from '../../components';

// ナビゲーションの型定義
type RootStackParamList = {
  Home: undefined;
  CropDetail: { cropId: number };
  AddCrop: undefined;
  Settings: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  // 今日のタスクを取得
  const {
    data: todayTasks,
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: () => tasksApi.getToday(),
  });

  // 作物一覧を取得
  const {
    data: crops,
    isLoading: cropsLoading,
    refetch: refetchCrops,
  } = useQuery({
    queryKey: ['crops'],
    queryFn: () => cropsApi.getAll(),
  });

  // タスク完了ミューテーション
  const completeTaskMutation = useMutation({
    mutationFn: (taskId: number) => tasksApi.complete(taskId),
    onSuccess: () => {
      // タスクリストを再取得
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const isLoading = tasksLoading || cropsLoading;

  const onRefresh = () => {
    refetchTasks();
    refetchCrops();
  };

  // 栽培中の作物のみをフィルタリング
  // 収穫済み・失敗以外はすべて「栽培中」として扱う（新規作物は常に planted で作成されるため、
  // growing のみに絞ると追加直後の作物が一件も表示されなくなってしまう）
  // APIは配列を直接返すので、crops自体をフィルタリング
  const growingCrops =
    crops?.filter((c) => c.status !== 'harvested' && c.status !== 'failed') || [];

  // 今日の作業一覧（バックエンドは pending のもののみ返す）
  // APIは配列を直接返すので、todayTasks自体が配列
  const pendingTodayTasks = todayTasks || [];

  // 作物詳細画面へ遷移
  const handleCropPress = (cropId: number) => {
    navigation.navigate('CropDetail', { cropId });
  };

  // 作物追加画面へ遷移
  const handleAddCrop = () => {
    navigation.navigate('AddCrop');
  };

  // 設定画面へ遷移
  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  // タスク完了（どのタスクを完了させたか分かりやすいように、タスクIDを直接受け取る）
  const handleCompleteTask = (taskId: number) => {
    completeTaskMutation.mutate(taskId);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      {/* ヘッダー */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity className="p-2">
          <Ionicons name="menu" size={24} color="#1f2937" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSettings} className="p-2">
          <Ionicons name="settings-outline" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* タイトル */}
        <View className="px-4 pb-4">
          <Text className="text-3xl font-bold text-gray-800">マイガーデン</Text>
        </View>

        {/* 次の作業セクション */}
        <View className="px-4">
          <Text className="mb-3 text-lg font-bold text-gray-800">次の作業</Text>

          {pendingTodayTasks.length > 0 ? (
            <View>
              {pendingTodayTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => handleCompleteTask(task.id)}
                  activeOpacity={0.7}
                  className="mb-2 flex-row items-center rounded-xl bg-white p-4 shadow-sm"
                >
                  {/* タップで完了させるチェックボタン（一覧にあるのは常に未完了のタスクのみ） */}
                  <View className="mr-3 h-6 w-6 rounded-full border-2 border-emerald-500" />
                  <View className="flex-1">
                    <Text className="font-medium text-gray-800">{task.title}</Text>
                    {task.description && (
                      <Text className="mt-0.5 text-sm text-gray-500">
                        {task.description}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="rounded-xl bg-emerald-700 p-6">
              <Text className="text-center text-white">
                今日の作業はすべて完了しました！
              </Text>
            </View>
          )}
        </View>

        {/* 栽培中の作物セクション */}
        <View className="mt-6 px-4 pb-24">
          <Text className="mb-3 text-lg font-bold text-gray-800">
            栽培中の作物
          </Text>

          {growingCrops.length > 0 ? (
            growingCrops.map((crop) => (
              <CropCard
                key={crop.id}
                id={crop.id}
                name={crop.name}
                variety={crop.variety}
                plantedDate={crop.planted_date}
                expectedHarvestDate={crop.expected_harvest_date}
                status={crop.status}
                onPress={() => handleCropPress(crop.id)}
              />
            ))
          ) : (
            <View className="items-center rounded-xl bg-white py-12 shadow-sm">
              <Ionicons name="leaf-outline" size={48} color="#d1d5db" />
              <Text className="mt-4 text-gray-500">
                栽培中の作物はありません
              </Text>
              <TouchableOpacity
                onPress={handleAddCrop}
                className="mt-4 rounded-full bg-emerald-600 px-6 py-2"
              >
                <Text className="font-medium text-white">作物を追加する</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB（作物追加ボタン） */}
      <TouchableOpacity
        onPress={handleAddCrop}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-gray-800 shadow-lg"
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
