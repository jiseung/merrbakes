import Image from "next/image";
import Card from "@/components/Card";
import {InstagramItemProps} from "@/components/types";

export default function InstagramItem(props: InstagramItemProps) {
  return (
    <Card link={props.permalink}
          className={`border-merrbakes-brown flex-col items-center justify-center font-hand min-h-fit 
          ${props.className}`}>
      <Image src={props.media_url} alt={props.caption} width={1080} height={1080} className="w-5/6"/>
      <h2 className="text-merrbakes-brown">{props.caption}</h2>
    </Card>
  );
}