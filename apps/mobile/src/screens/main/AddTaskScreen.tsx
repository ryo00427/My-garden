// =============================================================================
// AddTaskScreen - タスク追加画面
// =============================================================================
// 新しいタスクを登録するフォームを提供します。
// カレンダー画面（日付指定）、作物詳細画面（作物指定）、タスク画面から遷移できます。
// 繰り返し設定（daily/weekly/monthly）にも対応します。

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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi, cropsApi } from '../../services/api';

type PriorityType = 'low' | 'medium' | 'high';
type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

// ナビゲーションの型定義
type RootStackParamList = {
  AddTask: { date?: string; cropId?: number };
};

type RouteType = RouteProp<RootStackParamList, 'AddTask'>;

const PRIORITY_OPTIONS: { key: PriorityType; label: string }[] = [
  { key: 'low', label: '低' },
  { key: 'medium', label: '中' },
  { key: 'high', label: '高' },
];

const RECURRENCE_OPTIONS: { key: RecurrenceType; label: string }[] = [
  { key: 'none', label: 'なし' },
  { key: 'daily', label: '毎日' },
  { key: 'weekly', label: '毎週' },
  { key: 'monthly', label: '毎月' },
];

export default function AddTaskScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDateStr, setDueDateStr] = useState(
    route.params?.date || new Date().toISOString().split('T')[0] || ''
  );
  const [priority, setPriority] = useState<PriorityType>('medium');
  const [cropId, setCropId] = useState<number | undefined>(route.params?.cropId);
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState('1');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 作物一覧を取得（作物ピッカー用）
  const { data: cropsData } = useQuery({
    queryKey: ['crops'],
    queryFn: () => cropsApi.getAll(),
  });
  const crops = cropsData || [];
  const selectedCrop = crops.find((c) => c.id === cropId);

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      due_date: string;
      priority: PriorityType;
      crop_id?: number;
      recurrence?: 'daily' | 'weekly' | 'monthly';
      recurrence_interval?: number;
    }) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigation.goBack();
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message });
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'タイトルを入力してください';
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dueDateStr.trim() || !dateRegex.test(dueDateStr)) {
      newErrors.date = '期限をYYYY-MM-DD形式で入力してください';
    }

    if (recurrence !== 'none') {
      const interval = Number(recurrenceInterval);
      if (!recurrenceInterval.trim() || !Number.isInteger(interval) || interval <= 0) {
        newErrors.recurrenceInterval = '繰り返し間隔は1以上の整数で入力してください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      due_date: new Date(dueDateStr + 'T00:00:00Z').toISOString(),
      priority,
      crop_id: cropId,
      recurrence: recurrence === 'none' ? undefined : recurrence,
      recurrence_interval: recurrence === 'none' ? undefined : Number(recurrenceInterval),
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
          <Text className="text-lg font-bold text-gray-800">タスクの追加</Text>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-4 py-6">
            {/* タイトル */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-gray-700">
                タイトル <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="例：水やり"
                placeholderTextColor="#9ca3af"
                className={`rounded-lg border bg-white px-4 py-3 text-base text-gray-800 ${
                  errors.title ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.title && <Text className="mt-1 text-sm text-red-500">{errors.title}</Text>}
            </View>

            {/* 説明 */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-gray-700">説明（オプション）</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="タスクの詳細"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="h-20 rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-800"
              />
            </View>

            {/* 期限 */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-gray-700">
                期限 <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={dueDateStr}
                onChangeText={setDueDateStr}
                placeholder="2024-01-01"
                placeholderTextColor="#9ca3af"
                className={`rounded-lg border bg-white px-4 py-3 text-base text-gray-800 ${
                  errors.date ? 'border-red-500' : 'border-gray-200'
                }`}
                keyboardType="numbers-and-punctuation"
              />
              {errors.date && <Text className="mt-1 text-sm text-red-500">{errors.date}</Text>}
            </View>

            {/* 対象の作物 */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-gray-700">対象の作物（任意）</Text>
              <TouchableOpacity
                onPress={() => setShowCropPicker(!showCropPicker)}
                className="flex-row items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <Text className="text-base text-gray-800">
                  {selectedCrop ? selectedCrop.name : 'なし'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9ca3af" />
              </TouchableOpacity>
              {showCropPicker && (
                <View className="mt-2 rounded-lg border border-gray-200 bg-white">
                  <TouchableOpacity
                    onPress={() => {
                      setCropId(undefined);
                      setShowCropPicker(false);
                    }}
                    className="border-b border-gray-100 px-4 py-3"
                  >
                    <Text className="text-gray-500">なし</Text>
                  </TouchableOpacity>
                  {crops.map((crop) => (
                    <TouchableOpacity
                      key={crop.id}
                      onPress={() => {
                        setCropId(crop.id);
                        setShowCropPicker(false);
                      }}
                      className="border-b border-gray-100 px-4 py-3"
                    >
                      <Text
                        className={
                          cropId === crop.id ? 'font-medium text-emerald-600' : 'text-gray-800'
                        }
                      >
                        {crop.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 優先度 */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-gray-700">優先度</Text>
              <View className="flex-row gap-2">
                {PRIORITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setPriority(opt.key)}
                    className={`flex-1 items-center rounded-lg border py-3 ${
                      priority === opt.key
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Text
                      className={`font-medium ${
                        priority === opt.key ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 繰り返し */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-gray-700">繰り返し</Text>
              <View className="flex-row flex-wrap">
                {RECURRENCE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setRecurrence(opt.key)}
                    className={`mb-2 mr-2 rounded-lg px-4 py-2 ${
                      recurrence === opt.key ? 'bg-emerald-500' : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`font-medium ${
                        recurrence === opt.key ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {recurrence !== 'none' && (
                <View className="mt-2">
                  <Text className="mb-2 text-sm text-gray-600">
                    間隔（例：2を指定すると2
                    {recurrence === 'daily' ? '日' : recurrence === 'weekly' ? '週' : 'ヶ月'}
                    ごと）
                  </Text>
                  <TextInput
                    value={recurrenceInterval}
                    onChangeText={setRecurrenceInterval}
                    keyboardType="number-pad"
                    className={`w-24 rounded-lg border bg-white px-4 py-3 text-base text-gray-800 ${
                      errors.recurrenceInterval ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {errors.recurrenceInterval && (
                    <Text className="mt-1 text-sm text-red-500">
                      {errors.recurrenceInterval}
                    </Text>
                  )}
                  <Text className="mt-2 text-xs text-gray-400">
                    タスクを完了するたびに、次回分のタスクが自動的に作成されます。
                  </Text>
                </View>
              )}
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
            disabled={createMutation.isPending}
            className={`items-center rounded-full py-4 ${
              createMutation.isPending ? 'bg-emerald-300' : 'bg-emerald-500'
            }`}
          >
            <Text className="text-lg font-bold text-white">
              {createMutation.isPending ? '保存中...' : 'タスクを作成'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
