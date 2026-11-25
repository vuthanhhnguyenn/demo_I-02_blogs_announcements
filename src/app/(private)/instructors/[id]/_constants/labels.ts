/**
 * Display labels for the instructor detail screen (D04-02): the change-history field names, keyed
 * by the API-109 §5.3 snapshot fields they are diffed from.
 */
export const HISTORY_FIELD_LABELS = {
  name: '氏名',
  romanizedName: '英字サブネーム',
  nickname: 'ニックネーム',
  coachTypes: '役割区分',
  bio: 'プロフィール文',
  careerHistory: '指導歴',
  facePhoto: '顔写真',
  minBookingHours: '最短受付期間',
  bufferBeforeMin: '前バッファ',
  bufferAfterMin: '後バッファ',
  staffId: 'CRMアカウント紐づけ',
  isActive: 'ステータス',
} as const;
