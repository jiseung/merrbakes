export interface KofiAPIResponseType {
  Alias: string;
  Name: string;
  Price: number;
  ThumbnailUrls: string[];
  IsSoldOut: boolean;
  Description: string;
  IsPayWhatYouWant: boolean;
  RequiresShipping: boolean;
  ExclusiveToSubscribers: boolean;
  IsMemberOnly: boolean;
  ExemptFromSalesTax: boolean;
  PercentageDiscount: number;
  ShopCategoryIds: number[];
  LimitItemsEnabled: boolean;
  ItemsAvailable: number | null;
  OrderCount: number;
  ScheduledToPublishAt: string | null;
  IsScheduled: boolean;
  ScheduledDateUI: string;
  ScheduledTimeUI: string;
}

export interface KofiItemType {
  name: string;
  price: number;
  flexiblePrice: boolean;
  link: string;
  image: string;
  desc: string;
  isSoldOut: boolean;
  stock: number | null;
  preorder: boolean;
}

// Ko-fi "Shop Order" webhook payload — POSTed as form-encoded field `data` (JSON string).
// https://ko-fi.com/manage/webhooks
export interface KofiWebhookShopItemType {
  direct_link_code: string;
  variation_name: string;
  quantity: number;
}

export interface KofiWebhookShippingType {
  full_name: string;
  street_address: string;
  city: string;
  state_or_province: string;
  postal_code: string;
  country: string;
  country_code: string;
  telephone: string;
}

export interface KofiWebhookPayloadType {
  verification_token: string;
  message_id: string;
  timestamp: string;
  type: string; // "Shop Order" | "Donation" | "Subscription" | "Commission" | "Tip"
  from_name: string;
  message: string | null;
  amount: string;
  currency: string;
  email: string;
  kofi_transaction_id: string;
  shop_items: KofiWebhookShopItemType[] | null;
  shipping: KofiWebhookShippingType | null;
  is_public: boolean;
  // subscription-only fields (type === "Subscription")
  is_subscription_payment?: boolean;
  is_first_subscription_payment?: boolean;
  tier_name?: string | null;
}

export interface InstagramAPIResponseType {
  id: string;
  media_type: string;
  media_url: string;
  username: string;
  timestamp: string;
  permalink: string;
  caption: string;
  thumbnail_url: string;
}

export interface InstagramItemType {
  id: string;
  media_type: string;
  media_url: string;
  username: string;
  timestamp: string;
  permalink: string;
  caption: string;
  thumbnail_url: string;
}