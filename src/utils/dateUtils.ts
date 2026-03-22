/**
 * 日付操作ユーティリティ
 */

/**
 * 指定された日付（または現在）の「23:59:59.999」のISO文字列を返す
 * @param dateStr HTML5 Date Input などからの "YYYY-MM-DD" 文字列 または Dateオブジェクト
 */
export const getEndOfDay = (dateInput?: string | Date): string => {
  const date = dateInput ? new Date(dateInput) : new Date();
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
};

/**
 * 期限が現在時刻を過ぎているか判定する（その日の23:59:59を過ぎた場合のみ true）
 */
export const isOverdue = (dueDateStr: string): boolean => {
  const now = new Date();
  const deadline = new Date(dueDateStr);
  // もし dueDateStr が YYYY-MM-DD 形式なら、その日の最後に設定し直す
  // すでに ISOString で 23:59:59 が入っている場合も上書きして安全性を高める
  deadline.setHours(23, 59, 59, 999);
  return deadline < now;
};

/**
 * 今日との日数差を計算する
 * 0: 今日が期限, 1: 明日が期限, -1: 期限超過
 */
export const getDiffDays = (dueDateStr: string): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * 表示用の日付文字列を返す (YY/MM/DD)
 */
export const formatDisplayDate = (dueDateStr: string): string => {
  const date = new Date(dueDateStr);
  const year = date.getFullYear().toString().slice(-2);
  return `${year}/${date.getMonth() + 1}/${date.getDate()}`;
};
