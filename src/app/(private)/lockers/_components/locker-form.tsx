import { LockerFormAreaSection } from './locker-form-area-section';
import { LockerFormBasicInfoSection } from './locker-form-basic-info-section';
import { LockerFormConfigurationSection } from './locker-form-configuration-section';

type LockerFormProps = {
  mode?: 'create' | 'edit';
  lockerId?: string;
  /** Leaves for 店舗マップ設定 through the page's unsaved-changes guard (Y-02-05 FR-072) */
  onOpenStoreMap: (href: string) => void;
  /** See `LockerFormAreaSection` */
  onUploadingChange?: (isUploading: boolean) => void;
};

export function LockerForm({
  mode = 'create',
  lockerId,
  onOpenStoreMap,
  onUploadingChange,
}: LockerFormProps) {
  return (
    <div className="space-y-6">
      <LockerFormBasicInfoSection isEdit={mode === 'edit'} />
      <LockerFormAreaSection
        excludeLockerId={mode === 'edit' ? lockerId : undefined}
        onOpenStoreMap={onOpenStoreMap}
        onUploadingChange={onUploadingChange}
      />
      <LockerFormConfigurationSection mode={mode} lockerId={lockerId} />
    </div>
  );
}
