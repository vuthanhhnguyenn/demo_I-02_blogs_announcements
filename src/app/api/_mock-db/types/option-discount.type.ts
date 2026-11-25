import type {
  GetOptionDiscountsResponse,
  OptionDiscountDetail,
} from '@/app/api/_schemas/option-discount.schema';

/** Stored row: everything the detail returns except the fixed application rules. */
export type OptionDiscountRow = Omit<OptionDiscountDetail, 'rules'>;

export type OptionDiscountType = {
  _rows: OptionDiscountRow[];
  _seeded: boolean;
  _seed(): void;
  getList(): GetOptionDiscountsResponse['option_discounts'];
  getById(id: string): OptionDiscountDetail | undefined;
  add(data: {
    name: string;
    description?: string | null;
    target_options: string[];
    discount_type: string;
    discount_value: number;
    conditions: string;
    status?: string;
  }): OptionDiscountDetail;
  update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      target_options?: string[];
      discount_type?: string;
      discount_value?: number;
      conditions?: string;
      status?: string;
    },
  ): OptionDiscountDetail | undefined;
  /** Deactivate/activate. Set discounts are never deleted — G-02 L206 defines no delete operation. */
  updateStatus(id: string, status: 'active' | 'inactive'): OptionDiscountDetail | undefined;
};
