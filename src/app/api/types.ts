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