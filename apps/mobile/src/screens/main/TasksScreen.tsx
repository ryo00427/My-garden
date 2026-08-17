// =============================================================================
// TasksScreen - タスク一覧画面
// =============================================================================
// タスクの一覧表示と管理を提供します。
// タスクの完了・削除・フィルタリング機能を提供します。
// タスクの新規作成はAddTaskScreen（繰り返し設定にも対応）に遷移して行います。

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tasksApi, cropsApi } from '../../services/api';
import { showAlert } from '../../utils/alert';

type FilterType = 'all' | 'today' | 'overdue';

// ナビゲーションの型定義
type RootStackParamList = {
  AddTask: { date?: string; cropId?: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TasksScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');

  // タスク一覧を取得
  const { data: allTasks, isLoading, refetch } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: () => {
      switch (filter) {
        case 'today':
          return tasksApi.getToday();
        case 'overdue':
          return tasksApi.getOverdue();
        default:
          return tasksApi.getAll();
      }
    },
  });

  // 作物一覧を取得（タスクとの紐付け表示用）
  const { data: cropsData } = useQuery({
    queryKey: ['crops'],
    queryFn: () => cropsApi.getAll(),
  });
  const crops = cropsData || [];
  // 作物IDから作物名を引くためのマップ
  const cropNameById = new Map(crops.map((c) => [c.id, c.name]));

  // タスク完了ミューテーション
  const completeMutation = useMutation({
    mutationFn: (id: number) => tasksApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      showAlert('エラー', error instanceof Error ? error.message : 'タスクの完了に失敗しました');
    },
  });

  const handleComplete = (id: number, title: string) => {
    showAlert(
      'タスク完了',
      `「${title}」を完了しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '完了',
          onPress: () => completeMutation.mutate(id),
        },
      ]
    );
  };

  // タスク削除ミューテーション
  const deleteMutation = useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      showAlert('エラー', error instanceof Error ? error.message : 'タスクの削除に失敗しました');
    },
  });

  const handleDelete = (id: number, title: string) => {
    showAlert(
      'タスクを削除',
      `「${title}」を削除しますか？この操作は取り消せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ]
    );
  };

  // タスク追加画面へ遷移
  const handleAddTask = () => {
    navigation.navigate('AddTask', {});
  };

  // APIは配列を直接返すので、allTasks自体が配列
  const tasks = allTasks || [];

  return (
    <View className="flex-1 bg-gray-50">
      {/* フィルタータブ */}
      <View className="flex-row border-b border-gray-200 bg-white px-4">
        {[
          { key: 'all', label: 'すべて' },
          { key: 'today', label: '今日' },
          { key: 'overdue', label: '期限切れ' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            className={`mr-4 py-3 ${
              filter === item.key ? 'border-b-2 border-primary-600' : ''
            }`}
            onPress={() => setFilter(item.key as FilterType)}
          >
            <Text
              className={`text-base ${
                filter === item.key
                  ? 'font-semibold text-primary-600'
                  : 'text-gray-500'
              }`}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <View
              key={task.id}
              className="mb-3 rounded-lg bg-white p-4 shadow-sm"
            >
              <View className="flex-row items-start">
                {/* 完了ボタン */}
                <TouchableOpacity
                  className={`mr-3 h-6 w-6 items-center justify-center rounded-full border-2 ${
                    task.status === 'completed'
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                  }`}
                  onPress={() => {
                    if (task.status !== 'completed') {
                      handleComplete(task.id, task.title);
                    }
                  }}
                  disabled={task.status === 'completed'}
                >
                  {task.status === 'completed' && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </TouchableOpacity>

                {/* タスク情報 */}
                <View className="flex-1">
                  <Text
                    className={`text-base ${
                      task.status === 'completed'
                        ? 'text-gray-400 line-through'
                        : 'text-gray-800'
                    }`}
                  >
                    {task.title}
                  </Text>
                  {task.description && (
                    <Text className="mt-1 text-sm text-gray-500">
                      {task.description}
                    </Text>
                  )}
                  {/* 紐づく作物（マイプラント） */}
                  {task.crop_id != null && cropNameById.has(task.crop_id) && (
                    <View className="mt-2 flex-row items-center self-start rounded-full bg-emerald-50 px-2 py-0.5">
                      <Ionicons name="leaf" size={12} color="#059669" />
                      <Text className="ml-1 text-xs font-medium text-emerald-700">
                        {cropNameById.get(task.crop_id)}
                      </Text>
                    </View>
                  )}
                  {/* 繰り返し設定 */}
                  {task.recurrence && (
                    <View className="mt-2 flex-row items-center self-start rounded-full bg-blue-50 px-2 py-0.5">
                      <Ionicons name="repeat" size={12} color="#2563eb" />
                      <Text className="ml-1 text-xs font-medium text-blue-700">
                        {task.recurrence === 'daily'
                          ? '毎日'
                          : task.recurrence === 'weekly'
                          ? '毎週'
                          : '毎月'}
                      </Text>
                    </View>
                  )}
                  <View className="mt-2 flex-row items-center">
                    {/* 優先度バッジ */}
                    <View
                      className={`mr-2 rounded-full px-2 py-0.5 ${
                        task.priority === 'high'
                          ? 'bg-red-100'
                          : task.priority === 'medium'
                          ? 'bg-yellow-100'
                          : 'bg-green-100'
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          task.priority === 'high'
                            ? 'text-red-700'
                            : task.priority === 'medium'
                            ? 'text-yellow-700'
                            : 'text-green-700'
                        }`}
                      >
                        {task.priority === 'high'
                          ? '高'
                          : task.priority === 'medium'
                          ? '中'
                          : '低'}
                      </Text>
                    </View>
                    {/* 期限 */}
                    <View className="flex-row items-center">
                      <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                      <Text className="ml-1 text-xs text-gray-500">
                        {new Date(task.due_date).toLocaleDateString('ja-JP')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 削除ボタン */}
                <TouchableOpacity
                  className="ml-2 p-1"
                  onPress={() => handleDelete(task.id, task.title)}
                >
                  <Ionicons name="trash-outline" size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View className="items-center justify-center py-12">
            <Ionicons name="checkbox-outline" size={48} color="#d1d5db" />
            <Text className="mt-4 text-gray-500">タスクがありません</Text>
          </View>
        )}
      </ScrollView>

      {/* 追加ボタン */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary-600 shadow-lg"
        onPress={handleAddTask}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
