// =============================================================================
// alert - クロスプラットフォーム対応アラート/確認ダイアログ
// =============================================================================
// react-native-web の Alert.alert は完全な no-op（何も表示しない）実装のため、
// Web 実行時はエラー表示や削除確認などが一切機能しない。
// Web では window.alert / window.confirm にフォールバックすることで、
// ネイティブ(iOS/Android)と同じ呼び出し方のまま全プラットフォームで動作させる。

import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = [title, message].filter(Boolean).join('\n\n');

  // ボタンが0〜1個なら単純な通知として扱う
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  // 2個以上のボタンがある場合はOK/キャンセルの確認ダイアログとして扱う
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const confirmButton = buttons.find((b) => b !== cancelButton) ?? buttons[buttons.length - 1];

  if (window.confirm(text)) {
    confirmButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
