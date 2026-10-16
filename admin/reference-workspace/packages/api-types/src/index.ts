export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: string;
}
export interface Page<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
}
export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year_from: number;
  year_to: number;
  engine_code: string;
  trim: string;
  market: string;
  nickname?: string;
  garage_id?: number;
}
export interface Listing {
  id: number;
  part_id: number;
  branch_id: number;
  shop_id: number;
  shop_name: string;
  branch_name: string;
  address: string;
  phone?: string;
  price: string;
  currency: string;
  quantity: number;
  condition: string;
  status: string;
  supplier_sku: string;
  part_name?: string;
  part_number?: string;
}
export interface Part {
  id: number;
  name: string;
  part_number: string;
  description: string;
  manufacturer: string;
  category: string;
  category_id: number;
  listings: Listing[];
  images?: { id: number; url: string }[];
  compatibility?: { vehicle_variant_id: number; fitment_notes: string }[];
  attributes?: { attribute_name: string; attribute_value: string }[];
}
export interface Branch {
  id: number;
  shop_id: number;
  name: string;
  address: string;
  phone?: string;
  latitude?: string;
  longitude?: string;
}
export interface Shop {
  id: number;
  name: string;
  description: string;
  branches: Branch[];
  members?: { id: number; user_id: number; role: string }[];
  reviews?: { rating: number; comment: string }[];
}
export interface Offer {
  id: number;
  shop_id: number;
  shop_name?: string;
  price: string;
  currency: string;
  availability: string;
  status: string;
}
export interface PartRequest {
  id: number;
  vehicle_variant_id: number;
  vehicle?: Vehicle;
  part_id?: number;
  description: string;
  quantity: number;
  status: string;
  offers: Offer[];
  images: { id: number }[];
}
export interface Notification {
  id: number;
  type: string;
  payload: { message: string; request_id?: number };
  read_at?: string;
}
export interface Simulation {
  id: number;
  title: string;
  description: string;
  is_concept: boolean;
  status: string;
  steps: {
    id: number;
    step_number: number;
    instruction: string;
    warning?: string;
  }[];
  parts: number[];
  viewer_url: string;
  model_url?: string;
}
