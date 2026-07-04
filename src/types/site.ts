export type Site = {
  id?: number;
  name: string;
  status: string;
  inventoryVisibleToGuests?: boolean;
  insuranceEnabled?: boolean;
  insuranceProviderName?: string | null;
  insurancePremium?: number | null;
  insuranceDeductionMode?: string | null;
};
