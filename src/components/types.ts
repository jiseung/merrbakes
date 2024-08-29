import React from "react";
import {InstagramItemType, KofiItemType} from "@/app/api/types";

interface ComponentProps {
  className?: string;
  id?: string;
  key?: string | number;
}
export interface CardProps extends ComponentProps {
  children: React.ReactNode;
  link?: string;
}

export type BannerTypes = 'preorder' | 'soldout' | 'stock' | 'none';
export interface KofiItemProps extends ComponentProps {
  item: KofiItemType;
}
export interface ReviewType {
  author: string;
  content: string;
}

export interface DiscordItemProps extends ComponentProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export type InstagramItemProps = InstagramItemType & ComponentProps;
export type MailingListProps = ComponentProps;
export interface MenuProps extends ComponentProps {
  scrollTo: (id: string) => void;
}