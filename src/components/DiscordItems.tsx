import Card from "@/components/Card";
import Image from "next/image";
import {DiscordItemProps} from "@/components/types";

export default function DiscordItems() {
  const prefix = '/merrbakes-discord - ';
  const DiscordItem = (props: DiscordItemProps) => {
    return (
      <Card className="border-merrbakes-brown">
        <Image src={props.src} alt={props.alt} width={props.width} height={props.height} className="m-auto"/>
      </Card>
    )
  }

  return (
    <>
      {DiscordItem({src: `${prefix}1.jpeg`, alt: 'spicy merr on discord', width: 1064, height: 442})}
      {DiscordItem({src: `${prefix}2.jpeg`, alt: 'funny merr on discord', width: 1450, height: 666})}
      {DiscordItem({src: `${prefix}3.jpeg`, alt: 'silly merr on discord', width: 1346, height: 988})}
    </>
  )
}